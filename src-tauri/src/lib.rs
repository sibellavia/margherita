use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct FileItem {
    name: String,
}

#[tauri::command]
async fn list_files() -> Result<Vec<FileItem>, String> {
    // For testing, just return some mock data
    Ok(vec![
        FileItem {
            name: "test1.md".into(),
        },
        FileItem {
            name: "test2.md".into(),
        },
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
