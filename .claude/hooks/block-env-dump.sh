#!/usr/bin/env bash
# PreToolUse hook (Bash|PowerShell): blocks commands that would print the full
# contents of secret-bearing files (.env*, .dev.vars) into the conversation.
# grep is still allowed, but only when used with -o/-oE/-oP/--only-matching
# (key-names-only extraction) — a plain grep can print a whole matching line,
# secret value included, so it's treated like cat/type/head/tail/etc.
# Commands that merely reference the file without printing it (ls, rm, mv,
# wc, stat, chmod, ...) are left alone.
#
# Uses node (not jq — not guaranteed present) to parse the hook's stdin JSON
# and to strip heredoc bodies before scanning: `git commit -m "$(cat <<'EOF'
# ...EOF)"` is a normal way to build a multi-line commit message and reads no
# file, but the heredoc body is free text that may happen to mention a
# filename like ".env.example" — that must not itself trigger a block.

cmd=$(node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try {
    const j = JSON.parse(d);
    let cmd = (j.tool_input && j.tool_input.command) || '';
    // Drop heredoc bodies (prose/data, not commands or file paths).
    cmd = cmd.replace(/<<-?\s*(['\"]?)(\w+)\1[\s\S]*?\n[ \t]*\2\b/g, '<<HEREDOC');
    // 'cat <<HEREDOC' (string-building idiom) reads no file — drop the 'cat'.
    cmd = cmd.replace(/\bcat\b(\s*)<<HEREDOC/gi, '\$1REDIRECTED_STDIN');
    process.stdout.write(cmd);
  } catch (e) {}
});
")

if [ -z "$cmd" ]; then
  echo '{}'
  exit 0
fi

file_re='\.env(\.[A-Za-z0-9_-]+)?([^A-Za-z0-9_.-]|$)|\.dev\.vars([^A-Za-z0-9_.-]|$)'
if ! echo "$cmd" | grep -qiE "$file_re"; then
  echo '{}'
  exit 0
fi

dump_re='\b(cat|type|head|tail|less|more|bat|Get-Content|gc|sed|awk)\b'
is_dump=0
echo "$cmd" | grep -qiE "$dump_re" && is_dump=1

has_grep=0
echo "$cmd" | grep -qiE '\bgrep\b' && has_grep=1

safe_grep=1
if [ "$has_grep" = "1" ]; then
  if echo "$cmd" | grep -qE '(^|[^A-Za-z0-9-])-[A-Za-z]*o[A-Za-z]*([^A-Za-z0-9-]|$)|--only-matching'; then
    safe_grep=1
  else
    safe_grep=0
  fi
fi

if [ "$is_dump" = "1" ] || { [ "$has_grep" = "1" ] && [ "$safe_grep" = "0" ]; }; then
  reason='This command would print the full contents of a secret-bearing file (.env*/.dev.vars) into the conversation. Use: grep -oE "^[A-Z_]+=" <file>  to list variable names only, without values. Do not cat/type/head/tail/less/more/Get-Content/sed/awk these files, and do not grep them without -o.'
  node -e "process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:process.argv[1]}}))" "$reason"
else
  echo '{}'
fi
