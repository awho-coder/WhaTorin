use base64::Engine as _;
use tauri::WebviewUrl;
use tauri::WebviewWindowBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // Workaround para AppImage: reduce cuelgues de WebKit al renderizar chats.
        if std::env::var_os("APPIMAGE").is_some() {
            if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
            if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
                std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
            }

            // AppImage puede perder discovery de plugins de GStreamer.
            let gst_plugin_dirs = [
                "/usr/lib64/gstreamer-1.0",
                "/usr/lib/x86_64-linux-gnu/gstreamer-1.0",
            ];
            if std::env::var_os("GST_PLUGIN_SYSTEM_PATH_1_0").is_none() {
                let joined = gst_plugin_dirs
                    .iter()
                    .filter(|dir| std::path::Path::new(dir).is_dir())
                    .copied()
                    .collect::<Vec<_>>()
                    .join(":");
                if !joined.is_empty() {
                    std::env::set_var("GST_PLUGIN_SYSTEM_PATH_1_0", &joined);
                }
            }
            if std::env::var_os("GST_PLUGIN_PATH").is_none() {
                let joined = gst_plugin_dirs
                    .iter()
                    .filter(|dir| std::path::Path::new(dir).is_dir())
                    .copied()
                    .collect::<Vec<_>>()
                    .join(":");
                if !joined.is_empty() {
                    std::env::set_var("GST_PLUGIN_PATH", &joined);
                }
            }
            if std::env::var_os("GST_PLUGIN_SCANNER").is_none() {
                for scanner in [
                    "/usr/libexec/gstreamer-1.0/gst-plugin-scanner",
                    "/usr/lib64/gstreamer-1.0/gst-plugin-scanner",
                    "/usr/lib/x86_64-linux-gnu/gstreamer1.0/gst-plugin-scanner",
                    "/usr/lib/gstreamer-1.0/gst-plugin-scanner",
                ] {
                    if std::path::Path::new(scanner).is_file() {
                        std::env::set_var("GST_PLUGIN_SCANNER", scanner);
                        break;
                    }
                }
            }
            println!(
                "[WhaTorin] AppImage safe mode: DMABUF={} COMPOSITING={} GST_PATH={} GST_SCANNER={}",
                std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").unwrap_or_else(|_| "0".into()),
                std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").unwrap_or_else(|_| "0".into()),
                std::env::var("GST_PLUGIN_SYSTEM_PATH_1_0").unwrap_or_else(|_| "-".into()),
                std::env::var("GST_PLUGIN_SCANNER").unwrap_or_else(|_| "-".into())
            );
        }
    }

    let theme_css = include_str!("../../theme.css");
    let inject_js = include_str!("inject.js");
    let disable_injection = std::env::var("WHATORIN_DISABLE_INJECTION")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let lite_mode = std::env::var("WHATORIN_LITE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let should_inject = !disable_injection && !lite_mode;

    let full_injection = if should_inject {
        let easter_sound_data_url = format!(
            "data:audio/ogg;base64,{}",
            base64::engine::general_purpose::STANDARD
                .encode(include_bytes!("../../assets/sounds/torin-easter.ogg"))
        );

        // Combinamos el CSS en un script de inyección más robusto.
        Some(format!(
            r#"
            (function() {{
                function applyTheme() {{
                    if (document.getElementById('whatorin-theme')) return;
                    const style = document.createElement('style');
                    style.id = 'whatorin-theme';
                    style.textContent = `{}`;
                    (document.head || document.documentElement).appendChild(style);
                    console.log('WhaTorin: Tema aplicado.');
                }}

                if (document.readyState === 'loading') {{
                    document.addEventListener('DOMContentLoaded', applyTheme);
                }} else {{
                    applyTheme();
                }}

                // Re-aplicar por si WhatsApp limpia el <head>; evitamos observar todo el DOM.
                let scheduled = false;
                const observer = new MutationObserver(() => {{
                    if (scheduled) return;
                    scheduled = true;
                    requestAnimationFrame(() => {{
                        scheduled = false;
                        if (!document.getElementById('whatorin-theme')) applyTheme();
                    }});
                }});
                const themeRoot = document.head || document.documentElement;
                observer.observe(themeRoot, {{ childList: true }});

                window.__WHATORIN_EASTER_SOUND_SRC = `{}`;
                {}
            }})();
            "#,
            theme_css.replace('`', "\\`").replace('$', "\\$"),
            easter_sound_data_url
                .replace('`', "\\`")
                .replace('$', "\\$"),
            inject_js
        ))
    } else {
        None
    };

    tauri::Builder::default().setup(move |app| {
            let mut window_builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://web.whatsapp.com".parse().unwrap()),
            )
            .title("WhaTorin WSP")
            .inner_size(1200.0, 800.0)
            // Lite usa decoraciones del sistema (menos JS/UI inyectada).
            .decorations(lite_mode)
            .user_agent(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            )
            .enable_clipboard_access()
            // Importante: si no se desactiva, Tauri consume el file-drop y la web no recibe drag&drop.
            .disable_drag_drop_handler()
            .on_page_load(|window, payload| {
                println!(
                    "[WhaTorin] page_load {:?} {} ({})",
                    payload.event(),
                    payload.url(),
                    window.label()
                );
            });

            if lite_mode {
                println!("[WhaTorin] WHATORIN_LITE=1 (low-ram mode)");
            } else if disable_injection {
                println!("[WhaTorin] WHATORIN_DISABLE_INJECTION=1 (safe mode)");
            }

            if let Some(script) = full_injection.as_ref() {
                window_builder = window_builder.initialization_script(script);
            }

            // En Linux/Wayland conviene fijar el icono antes de crear la ventana.
            if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")) {
                window_builder = window_builder.icon(icon)?;
            }

            let _window = window_builder.build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
