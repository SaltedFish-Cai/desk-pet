#[tauri::command]
fn get_pet_position() -> Result<(f64, f64), String> {
    Ok((150.0, 300.0))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_pet_position])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
