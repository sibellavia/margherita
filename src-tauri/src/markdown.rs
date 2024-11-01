use pulldown_cmark::{Parser, html, Options};
use serde::Serialize;
use std::sync::Arc;
use parking_lot::RwLock;

// Cache structure
#[derive(Debug, Default)]
struct MarkdownCache {
    last_input: String,
    last_output: String,
}

// Global cache
lazy_static::lazy_static! {
    static ref CACHE: Arc<RwLock<MarkdownCache>> = Arc::new(RwLock::new(MarkdownCache::default()));
}

#[derive(Debug, Serialize)]
pub struct ParsedContent {
    html: String,
}

#[tauri::command]
pub async fn parse_markdown(input: String) -> Result<ParsedContent, String> {
    // Check cache first
    {
        let cache = CACHE.read();
        if cache.last_input == input {
            return Ok(ParsedContent {
                html: cache.last_output.clone(),
            });
        }
    }

    // Parse if not in cache
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_TASKLISTS);
    
    let parser = Parser::new_ext(&input, options);
    let mut html_output = String::with_capacity(input.len() * 2);
    html::push_html(&mut html_output, parser);

    // Update cache
    {
        let mut cache = CACHE.write();
        cache.last_input = input;
        cache.last_output = html_output.clone();
    }

    Ok(ParsedContent {
        html: html_output,
    })
}
