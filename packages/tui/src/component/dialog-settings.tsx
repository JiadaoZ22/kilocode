import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useKV } from "@tui/context/kv"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useOpencodeKeymap } from "../keymap"

type SettingsOption = {
  value: string
  title: string
  description?: string
  category: string
}

export function DialogSettings() {
  const sync = useSync()
  const theme = useTheme()
  const keymap = useOpencodeKeymap()
  const kv = useKV()

  const options: DialogSelectOption<string>[] = [
    // Agent / model
    { value: "model.list", title: "Switch model", category: "Agent" },
    { value: "agent.list", title: "Switch agent", category: "Agent" },
    { value: "mcp.list", title: "Toggle MCPs", category: "Agent" },
    { value: "variant.list", title: "Switch model variant", category: "Agent" },

    // Provider
    { value: "provider.connect", title: "Connect provider", category: "Provider" },
    ...(sync.data.console_state.switchableOrgCount > 1
      ? [{ value: "console.org.switch", title: "Switch org", category: "Provider" }]
      : []),

    // Indexing
    { value: "kilo.indexing", title: "Indexing configuration", category: "Indexing" },

    // Appearance
    { value: "theme.switch", title: "Switch theme", category: "Appearance" },
    {
      value: "theme.switch_mode",
      title: theme.mode() === "dark" ? "Switch to light mode" : "Switch to dark mode",
      category: "Appearance",
    },
    {
      value: "theme.mode.lock",
      title: theme.locked() ? "Unlock theme mode" : "Lock theme mode",
      category: "Appearance",
    },
    {
      value: "app.toggle.animations",
      title: kv.get("animations_enabled", true) ? "Disable animations" : "Enable animations",
      category: "Appearance",
    },

    // Behavior
    {
      value: "app.toggle.notifications",
      title: kv.get("bell_enabled", true) ? "Disable notifications" : "Enable notifications",
      category: "Behavior",
    },
    {
      value: "app.toggle.file_context",
      title: kv.get("file_context_enabled", true) ? "Disable file context" : "Enable file context",
      category: "Behavior",
    },
    {
      value: "app.toggle.diffwrap",
      title:
        kv.get("diff_wrap_mode", "word") === "word"
          ? "Disable diff wrapping"
          : "Enable diff wrapping",
      category: "Behavior",
    },
    {
      value: "app.toggle.paste_summary",
      title: kv.get("paste_summary_enabled", true) ? "Disable paste summary" : "Enable paste summary",
      category: "Behavior",
    },
    {
      value: "app.toggle.session_directory_filter",
      title: kv.get("session_directory_filter_enabled", true)
        ? "Disable session directory filtering"
        : "Enable session directory filtering",
      category: "Behavior",
    },
    {
      value: "terminal.title.toggle",
      title: kv.get("terminal_title_enabled", true) ? "Disable terminal title" : "Enable terminal title",
      category: "Behavior",
    },

    // System
    { value: "opencode.status", title: "View status", category: "System" },
    { value: "help.show", title: "Help", category: "System" },
  ]

  return (
    <DialogSelect
      title="Settings"
      options={options}
      skipFilter
      onSelect={(option) => {
        keymap.dispatchCommand(option.value)
      }}
    />
  )
}
