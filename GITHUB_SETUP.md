# How to Get the Spidey Pet Windows Installer

Follow these steps once and you'll have a proper `.exe` file anyone can download and install.

---

## Step 1 — Create a free GitHub account

Go to [github.com](https://github.com) and sign up. It's free.

---

## Step 2 — Create a new repository

1. Click the **+** button in the top right → **New repository**
2. Name it `spidey-pet` (or anything you like)
3. Set it to **Public**
4. Click **Create repository**

---

## Step 3 — Upload the code

On the repository page, click **uploading an existing file**.

Upload **everything** from inside the project folder (all the files and folders).

> You can also use GitHub Desktop app if you prefer a visual tool: [desktop.github.com](https://desktop.github.com)

Click **Commit changes**.

---

## Step 4 — Watch it build automatically

1. Click the **Actions** tab at the top of your repository
2. You'll see a workflow called **"Build Spidey Pet Desktop App"** running
3. Wait ~5 minutes for it to finish (green checkmark = done)

---

## Step 5 — Download your .exe

Once the build is green:

1. Click on the completed workflow run
2. Scroll down to **Artifacts**
3. Download **spidey-pet-windows**
4. Extract the zip — inside is the `Spidey Pet Setup.exe`
5. Double-click it to install

---

## Step 6 — Share it with anyone

Every time you push a version tag, GitHub automatically creates a public download page.

To create a release:
1. Go to your repository
2. Click **Releases** → **Create a new release**
3. Type a tag like `v1.0.0`
4. Click **Publish release**
5. The build runs and attaches the `.exe` and `.dmg` to the release page automatically
6. Share the link — anyone can download it with one click

---

## What the app does

- Opens as a small floating window in the bottom-right corner of the screen
- Stays on top of all other windows (Chrome, games, anything)
- System tray icon — double-click to show/hide
- Pin/unpin always-on-top with the pin button in the titlebar
- All pet data saved locally — no internet required
