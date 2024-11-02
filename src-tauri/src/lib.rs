use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct FileItem {
    name: String,
    is_dir: bool,
}

fn get_workspace_dir() -> PathBuf {
    let mut documents_dir = dirs::document_dir().expect("Failed to get documents directory");
    documents_dir.push("margherita");
    documents_dir
}

fn ensure_workspace_exists() -> Result<PathBuf, String> {
    let workspace_dir = get_workspace_dir();

    if !workspace_dir.exists() {
        fs::create_dir_all(&workspace_dir)
            .map_err(|e| format!("Failed to create workspace directory: {}", e))?;
    }

    Ok(workspace_dir)
}

#[tauri::command]
async fn list_files() -> Result<Vec<FileItem>, String> {
    let workspace_dir = ensure_workspace_exists()?;

    // If directory is empty, return empty vec
    if !workspace_dir
        .read_dir()
        .map_err(|e| e.to_string())?
        .next()
        .is_some()
    {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(workspace_dir).map_err(|e| e.to_string())?;

    let mut items = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;

        // Only show markdown files and directories
        if file_type.is_dir() || entry.path().extension().map_or(false, |ext| ext == "md") {
            items.push(FileItem {
                name: entry.file_name().to_string_lossy().into_owned(),
                is_dir: file_type.is_dir(),
            });
        }
    }

    // Sort: directories first, then files alphabetically
    items.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(items)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
