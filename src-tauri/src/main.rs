#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
mod pdf;

fn main() {
    let builder = tauri::Builder::default();
    #[cfg(windows)]
    let builder =
        builder
            .plugin(tauri_plugin_dialog::init())
            .invoke_handler(tauri::generate_handler![
                pdf::print_pdf,
                pdf::copy_pdf,
                pdf::save_pdf
            ]);
    builder
        .run(tauri::generate_context!())
        .expect("failed to start HubbyKit");
}
