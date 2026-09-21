pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn toolchain_runs_tests() {
        assert_eq!(1 + 1, 2);
    }
}
