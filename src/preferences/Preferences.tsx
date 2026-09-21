import { useEffect, useState } from "react";
import { preferencesBridge, type Settings } from "./preferencesBridge";
import { formatShortcut, shortcutFromKeyboardEvent } from "./shortcutCapture";

function Preferences() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    preferencesBridge.getSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const captureShortcut = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    const shortcut = shortcutFromKeyboardEvent(event.nativeEvent);
    if (!shortcut) return;
    event.preventDefault();
    try {
      await preferencesBridge.setShortcut(shortcut);
      setSettings({ ...settings, shortcut });
      setShortcutError(null);
    } catch (e) {
      setShortcutError(`Combinaison indisponible : ${String(e)}`);
    }
  };

  const changeNotePath = async (pick: (defaultPath: string) => Promise<string | null>) => {
    const path = await pick(settings.notePath);
    if (!path) return;
    await preferencesBridge.requestNotePath(path);
    setSettings({ ...settings, notePath: path });
  };

  const toggleAutostart = async (enabled: boolean) => {
    await preferencesBridge.setAutostart(enabled);
    setSettings({ ...settings, autostart: enabled });
  };

  return (
    <form className="prefs" onSubmit={(e) => e.preventDefault()}>
      <label className="prefs__row">
        <span>Raccourci</span>
        <input
          className="prefs__shortcut"
          readOnly
          value={formatShortcut(settings.shortcut)}
          onKeyDown={captureShortcut}
          aria-invalid={shortcutError !== null}
          title="Cliquer puis appuyer sur la combinaison voulue"
        />
      </label>
      {shortcutError && (
        <p className="prefs__error" role="alert">
          {shortcutError}
        </p>
      )}

      <div className="prefs__row">
        <span>Fichier de Note</span>
        <div className="prefs__path">
          <code title={settings.notePath}>{settings.notePath}</code>
          <div className="prefs__actions">
            <button type="button" onClick={() => changeNotePath(preferencesBridge.pickExistingNoteFile)}>
              Ouvrir un fichier existant…
            </button>
            <button type="button" onClick={() => changeNotePath(preferencesBridge.pickNewNoteFile)}>
              Créer un nouveau fichier…
            </button>
          </div>
        </div>
      </div>

      <label className="prefs__row">
        <span>Lancement au login</span>
        <input
          type="checkbox"
          role="switch"
          checked={settings.autostart}
          onChange={(e) => toggleAutostart(e.target.checked)}
        />
      </label>
    </form>
  );
}

export default Preferences;
