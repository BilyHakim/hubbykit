use std::{
    io::Write,
    os::windows::ffi::OsStrExt,
    path::{Path, PathBuf},
    ptr,
};
use tauri::{async_runtime::channel, ipc, WebviewWindow};
use tauri_plugin_dialog::DialogExt;
use webview2_com::{
    Microsoft::Web::WebView2::Win32::{ICoreWebView2Environment6, ICoreWebView2_16},
    PrintToPdfStreamCompletedHandler,
};
use windows::{core::Interface, Win32::System::Com::IStream};
use windows_sys::Win32::{
    Foundation::{GlobalFree, HWND},
    System::{
        DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData},
        Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE, GMEM_ZEROINIT},
        Ole::CF_HDROP,
    },
    UI::Shell::DROPFILES,
};

#[tauri::command]
pub async fn print_pdf(window: WebviewWindow) -> Result<ipc::Response, String> {
    let (sender, mut receiver) = channel(1);
    window
        .with_webview(move |webview| {
            let completed = sender.clone();
            // WebView2 and its completion callback run on the webview's UI thread.
            let started = unsafe {
                (|| {
                    let view: ICoreWebView2_16 = webview.controller().CoreWebView2()?.cast()?;
                    let environment: ICoreWebView2Environment6 = webview.environment().cast()?;
                    let settings = environment.CreatePrintSettings()?;
                    settings.SetPageWidth(210.0 / 25.4)?;
                    settings.SetPageHeight(297.0 / 25.4)?;
                    settings.SetShouldPrintBackgrounds(false)?;
                    settings.SetShouldPrintHeaderAndFooter(false)?;
                    let handler = PrintToPdfStreamCompletedHandler::create(Box::new(
                        move |status, stream| {
                            let result = status
                                .map_err(|error| error.to_string())
                                .and_then(|_| {
                                    stream.ok_or_else(|| "WebView2 did not produce a PDF.".into())
                                })
                                .and_then(read_pdf);
                            let _ = completed.try_send(result);
                            Ok(())
                        },
                    ));
                    view.PrintToPdfStream(&settings, &handler)
                })()
            };
            if let Err(error) = started {
                let _ = sender.try_send(Err(error.to_string()));
            }
        })
        .map_err(|error| error.to_string())?;

    receiver
        .recv()
        .await
        .ok_or("PDF printing was interrupted.")?
        .map(ipc::Response::new)
}

fn read_pdf(stream: IStream) -> Result<Vec<u8>, String> {
    let mut pdf = Vec::new();
    let mut chunk = [0u8; 16 * 1024];
    loop {
        let mut count = 0;
        unsafe {
            stream.Read(
                chunk.as_mut_ptr().cast(),
                chunk.len() as u32,
                Some(&mut count),
            )
        }
        .ok()
        .map_err(|error| error.to_string())?;
        if count == 0 {
            return Ok(pdf);
        }
        pdf.extend_from_slice(&chunk[..count as usize]);
    }
}

#[tauri::command]
pub fn copy_pdf(window: WebviewWindow, request: ipc::Request<'_>) -> Result<(), String> {
    let pdf = pdf_bytes(request.body())?;
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    // Explorer needs the source file to survive after HubbyKit closes.
    let path = write_pdf(pdf, &std::env::temp_dir())?;
    if let Err(error) = copy_file_drop(hwnd.0, &path) {
        let _ = std::fs::remove_file(path);
        return Err(error.to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn save_pdf(
    window: WebviewWindow,
    request: ipc::Request<'_>,
) -> Result<Option<PathBuf>, String> {
    let pdf = pdf_bytes(request.body())?;
    let (sender, mut receiver) = channel(1);
    window
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Save PDF")
        .set_file_name("HubbyKit.pdf")
        .add_filter("PDF document", &["pdf"])
        .save_file(move |selection| {
            let _ = sender.try_send(selection);
        });

    let Some(selection) = receiver
        .recv()
        .await
        .ok_or("Save dialog was interrupted.")?
    else {
        return Ok(None);
    };
    let path = selection.into_path().map_err(|error| error.to_string())?;
    let directory = path.parent().ok_or("Invalid save location.")?;
    // Write beside the destination before replacing it, so a failed write preserves the original.
    let mut file = tempfile::NamedTempFile::new_in(directory).map_err(|error| error.to_string())?;
    file.write_all(pdf).map_err(|error| error.to_string())?;
    file.persist(&path).map_err(|error| error.to_string())?;
    Ok(Some(path))
}

fn write_pdf(pdf: &[u8], directory: &Path) -> Result<PathBuf, String> {
    let mut file = tempfile::Builder::new()
        .prefix("HubbyKit-")
        .suffix(".pdf")
        .tempfile_in(directory)
        .map_err(|error| error.to_string())?;
    file.write_all(pdf).map_err(|error| error.to_string())?;
    file.into_temp_path()
        .keep()
        .map_err(|error| error.to_string())
}

fn pdf_bytes(body: &ipc::InvokeBody) -> Result<&[u8], String> {
    match body {
        ipc::InvokeBody::Raw(pdf) if pdf.starts_with(b"%PDF-") => Ok(pdf),
        _ => Err("Expected a PDF file.".into()),
    }
}

fn copy_file_drop(hwnd: HWND, path: &Path) -> std::io::Result<()> {
    let filename: Vec<u16> = path.as_os_str().encode_wide().chain([0, 0]).collect();
    let offset = std::mem::size_of::<DROPFILES>();
    // CF_HDROP owns a movable buffer containing a header and a double-NUL-terminated file list.
    unsafe {
        let memory = GlobalAlloc(GMEM_MOVEABLE | GMEM_ZEROINIT, offset + filename.len() * 2);
        if memory.is_null() {
            return Err(std::io::Error::last_os_error());
        }
        let result = (|| {
            let buffer = GlobalLock(memory).cast::<u8>();
            if buffer.is_null() {
                return Err(std::io::Error::last_os_error());
            }
            ptr::write_unaligned(
                ptr::addr_of_mut!((*buffer.cast::<DROPFILES>()).pFiles),
                offset as u32,
            );
            ptr::write_unaligned(ptr::addr_of_mut!((*buffer.cast::<DROPFILES>()).fWide), 1);
            ptr::copy_nonoverlapping(filename.as_ptr(), buffer.add(offset).cast(), filename.len());
            GlobalUnlock(memory);
            if OpenClipboard(hwnd) == 0 {
                return Err(std::io::Error::last_os_error());
            }
            let copied =
                EmptyClipboard() != 0 && !SetClipboardData(CF_HDROP.into(), memory).is_null();
            let error = (!copied).then(std::io::Error::last_os_error);
            CloseClipboard();
            error.map_or(Ok(()), Err)
        })();
        if result.is_err() {
            GlobalFree(memory);
        }
        result
    }
}
