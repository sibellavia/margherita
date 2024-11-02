use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct FileItem {
    name: String,
    is_dir: bool,
}

#[derive(Debug, Deserialize)]
pub struct SaveFileRequest {
    name: String,
    content: String,
}

#[derive(Debug, Serialize)]
pub struct FileContent {
    path: String,
    content: String,
}

// Get the standard margherita directory in Documents
fn get_margherita_dir() -> Result<PathBuf, String> {
    dirs::document_dir()
        .map(|mut path| {
            path.push("margherita");
            path
        })
        .ok_or_else(|| "Could not find Documents directory".to_string())
}

// Ensure the margherita directory exists
#[tauri::command]
async fn ensure_margherita_dir() -> Result<(), String> {
    let dir = get_margherita_dir()?;
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create margherita directory: {}", e))?;
        println!("Created margherita directory at: {:?}", dir);
    } else {
        println!("Margherita directory already exists at: {:?}", dir);
    }
    Ok(())
}

// List files in the margherita directory
#[tauri::command]
async fn list_files() -> Result<Vec<FileItem>, String> {
    let dir = get_margherita_dir()?;

    // Create directory if it doesn't exist
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;
        println!("Created new margherita directory");
        // Return empty list for new directory
        return Ok(Vec::new());
    }

    // If directory is empty, return empty vec
    if !dir.read_dir().map_err(|e| e.to_string())?.next().is_some() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries {
        match entry {
            Ok(entry) => {
                let file_type = entry.file_type().map_err(|e| e.to_string())?;

                // Only show .md files
                if let Some(ext) = entry.path().extension() {
                    if ext == "md" {
                        items.push(FileItem {
                            name: entry.file_name().to_string_lossy().into_owned(),
                            is_dir: file_type.is_dir(),
                        });
                    }
                }
            }
            Err(e) => println!("Error reading entry: {}", e),
        }
    }

    // Sort files alphabetically
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    println!("Found {} files in margherita directory", items.len());
    Ok(items)
}

#[tauri::command]
async fn save_file(request: SaveFileRequest) -> Result<String, String> {
    println!("save request received for file: {}", request.name);

    let dir = get_margherita_dir()?;
    println!("using directory: {:?}", dir);

    // Ensure filename ends with .md
    let filename = if !request.name.ends_with(".md") {
        format!("{}.md", request.name)
    } else {
        request.name
    };

    let file_path = dir.join(filename);
    println!("Full file path: {:?}", file_path); // Debug log

    // Save the file
    fs::write(&file_path, &request.content).map_err(|e| {
        println!("Error saving file: {}", e); // Debug log
        format!("Failed to save file: {}", e)
    })?;

    println!("Saved file: {:?}", file_path);

    Ok(file_path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn read_file(path: String) -> Result<FileContent, String> {
    println!("Reading file: {}", path);

    // Get the margherita directory
    let dir = get_margherita_dir()?;

    // Combine directory path with file name
    let file_path = dir.join(&path);
    println!("Full file path: {:?}", file_path);

    // Read the file content
    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(FileContent {
        path, // Keep the original relative path for the UI
        content,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ensure_margherita_dir,
            list_files,
            save_file,
            read_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
