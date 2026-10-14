import os
import time

from flask import Flask, render_template

import content

app = Flask(__name__)

STATIC_FILES = (
    os.path.join(app.static_folder, "css", "style.css"),
    os.path.join(app.static_folder, "js", "script.js"),
)


def asset_version():
    # Версия зависит от времени последнего изменения файлов стилей и скриптов.
    # Так браузер всегда подгружает свежие css/js после правок.
    try:
        latest = max(os.path.getmtime(path) for path in STATIC_FILES if os.path.exists(path))
    except ValueError:
        latest = time.time()
    return str(int(latest))


@app.route("/")
def home():
    game_config = {
        "target": content.GAME_TARGET,
        "duration": content.GAME_DURATION,
        "winMessages": content.GAME_WIN_MESSAGES,
        "winHeadline": content.GAME_WIN_HEADLINE,
        "winSub": content.GAME_WIN_SUB,
        "loseHeadline": content.GAME_LOSE_HEADLINE,
        "loseSub": content.GAME_LOSE_SUB,
    }
    return render_template("index.html", c=content, game_config=game_config, av=asset_version())


@app.after_request
def disable_cache_in_debug(response):
    # Во время разработки браузер не должен запоминать страницу и файлы,
    # чтобы правки в content.py / style.css / script.js были видны сразу.
    if app.debug:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


if __name__ == "__main__":
    # Локальный сервер разработки (авто-перезагрузка при правках).
    # На хостинге приложение запускается через gunicorn — см. Procfile и render.yaml.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
