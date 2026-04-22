#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PORT=8080
HOST=127.0.0.1

find_python() {
    if command -v python3 >/dev/null 2>&1; then
        echo python3
        return 0
    fi
    if command -v python >/dev/null 2>&1; then
        if python -c 'import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)' >/dev/null 2>&1; then
            echo python
            return 0
        fi
    fi
    return 1
}

ensure_brew_in_path() {
    if command -v brew >/dev/null 2>&1; then
        return 0
    fi
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
}

install_python_via_brew() {
    ensure_brew_in_path
    if ! command -v brew >/dev/null 2>&1; then
        echo ""
        echo "Homebrew не найден. Ставим Homebrew (официальный установщик)..."
        echo "Потребуется ввести пароль администратора macOS."
        echo ""
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        ensure_brew_in_path
    fi

    if ! command -v brew >/dev/null 2>&1; then
        echo ""
        echo "Не удалось установить Homebrew. Откройте https://brew.sh вручную и попробуйте снова."
        return 1
    fi

    echo ""
    echo "Устанавливаем Python 3 через Homebrew..."
    echo ""
    brew install python
}

PY="$(find_python || true)"

if [ -z "$PY" ]; then
    clear
    echo "================================"
    echo "  Dutch Learning"
    echo "================================"
    echo ""
    echo "  Python 3 не найден на этом Mac."
    echo "  Он нужен, чтобы поднять локальный сервер для сайта."
    echo ""
    printf "  Установить Python сейчас через Homebrew? [y/N]: "
    read -r REPLY
    echo ""

    case "$REPLY" in
        [Yy]*)
            if install_python_via_brew; then
                PY="$(find_python || true)"
                if [ -z "$PY" ]; then
                    echo ""
                    echo "Python установлен, но пока не виден в этой сессии."
                    echo "Закройте это окно и откройте файл снова."
                    echo ""
                    printf "Нажмите Enter для выхода..."
                    read -r _
                    exit 0
                fi
                echo ""
                echo "Python 3 установлен. Продолжаем запуск сайта..."
                echo ""
            else
                printf "Нажмите Enter для выхода..."
                read -r _
                exit 1
            fi
            ;;
        *)
            echo "Отмена. Без Python 3 сайт не запустится."
            printf "Нажмите Enter для выхода..."
            read -r _
            exit 0
            ;;
    esac
fi

CURRENT_PID=$$
CURRENT_TTY="$(tty 2>/dev/null || echo '')"

for existing_pid in $(pgrep -f "Dutch-Mac.command" 2>/dev/null || true); do
    if [ "$existing_pid" != "$CURRENT_PID" ]; then
        pkill -TERM -P "$existing_pid" 2>/dev/null || true
        kill -TERM "$existing_pid" 2>/dev/null || true
    fi
done

for existing_pid in $(pgrep -f "scripts/server.py" 2>/dev/null || true); do
    if [ "$existing_pid" != "$CURRENT_PID" ]; then
        cwd_of_pid="$(lsof -a -p "$existing_pid" -d cwd -Fn 2>/dev/null | awk '/^n/{sub(/^n/,""); print; exit}')"
        if [ "$cwd_of_pid" = "$SCRIPT_DIR" ] || [ "$cwd_of_pid" = "$SCRIPT_DIR/site" ]; then
            kill -TERM "$existing_pid" 2>/dev/null || true
        fi
    fi
done

for existing_pid in $(pgrep -f "http.server" 2>/dev/null || true); do
    if [ "$existing_pid" != "$CURRENT_PID" ]; then
        cwd_of_pid="$(lsof -a -p "$existing_pid" -d cwd -Fn 2>/dev/null | awk '/^n/{sub(/^n/,""); print; exit}')"
        if [ "$cwd_of_pid" = "$SCRIPT_DIR" ] || [ "$cwd_of_pid" = "$SCRIPT_DIR/site" ]; then
            kill -TERM "$existing_pid" 2>/dev/null || true
        fi
    fi
done

sleep 0.3

osascript >/dev/null 2>&1 <<APPLESCRIPT || true
tell application "Terminal"
    set toClose to {}
    repeat with w in windows
        try
            set t to selected tab of w
            set tabTTY to tty of t
            if tabTTY is not "$CURRENT_TTY" then
                set procs to processes of t
                set hasPython to false
                set hasRunner to false
                repeat with p in procs
                    if p contains "python" then set hasPython to true
                    if p contains "server.py" then set hasPython to true
                    if p contains "Dutch-Mac" then set hasRunner to true
                end repeat
                if hasPython or hasRunner then
                    set end of toClose to w
                end if
            end if
        end try
    end repeat
    repeat with w in toClose
        try
            close w saving no
        end try
    end repeat
end tell
APPLESCRIPT

while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/site/"

clear
echo "================================"
echo "  Dutch Learning — локальный сервер"
echo "================================"
echo ""
echo "  Адрес: $URL"
echo ""
echo "  Чтобы остановить сервер — закройте это окно"
echo "  или нажмите Ctrl+C."
echo ""
echo "================================"
echo ""

(
    for _ in $(seq 1 300); do
        if (exec 3<>"/dev/tcp/$HOST/$PORT") 2>/dev/null; then
            exec 3>&- 3<&- 2>/dev/null || true
            open "$URL"
            exit 0
        fi
        sleep 0.1
    done
) &

exec "$PY" "$SCRIPT_DIR/scripts/server.py" --port "$PORT" --bind "$HOST" --directory "$SCRIPT_DIR"
