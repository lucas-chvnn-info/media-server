#!/usr/bin/env python3
import os
import time
import subprocess
import re
import sys
import xml.etree.ElementTree as ET
import importlib.util

# Function to auto-install dependencies
def install_rich():
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "rich"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        print("Erreur: Impossible d'installer la librairie 'rich' automatiquement. Veuillez lancer 'pip install rich' manuellement.")
        sys.exit(1)

# Check for rich
if importlib.util.find_spec("rich") is None:
    print("Installation de la dépendance d'affichage 'rich'...")
    install_rich()

from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt, Confirm
from rich.padding import Padding
from rich.align import Align

# Configuration
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(ROOT_DIR, ".env")
DASHBOARD_ENV_FILE = os.path.join(ROOT_DIR, "dashboard-next", ".env")
COMPOSE = "docker compose"
CONFIG_DIR = os.path.join(ROOT_DIR, "config")

console = Console()

def print_step(msg):
    console.print(Padding(Text(f"\n[*] {msg}", style="bold blue"), (0, 0, 0, 0)))

def print_success(msg):
    console.print(Text(f"  ✔ {msg}", style="bold green"))

def print_error(msg):
    console.print(Text(f"  ✖ {msg}", style="bold red"))

def check_command(cmd):
    try:
        subprocess.check_call(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except:
        return False

def extract_api_key_from_xml(config_path):
    try:
        if not os.path.exists(config_path):
            return None
        tree = ET.parse(config_path)
        root = tree.getroot()
        api_key = root.find("ApiKey")
        if api_key is not None:
            return api_key.text
    except Exception as e:
        return None
    return None

def main():
    console.clear()
    console.print(Panel(
        Align.center("[bold magenta]STREAMING STACK - AUTO SETUP[/bold magenta]\n[dim]Installation & Configuration Automatique[/dim]"),
        border_style="magenta",
        expand=False
    ))
    
    # 1. Check Prerequisites
    print_step("Vérification des pré-requis")
    if not check_command("docker --version"):
        print_error("Docker n'est pas installé.")
        sys.exit(1)
    # Docker récent (Linux) : plugin « docker compose » ; ancien : « docker-compose »
    global COMPOSE
    if check_command("docker compose version"):
        COMPOSE = "docker compose"
    elif check_command("docker-compose --version"):
        COMPOSE = "docker-compose"
    else:
        print_error("Docker Compose n'est pas installé.")
        sys.exit(1)
    print_success("Docker & Docker Compose détectés")

    # 2. Cloudflare Token
    print_step("Configuration Cloudflare Tunnel")
    tunnel_token = ""
    
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            content = f.read()
            match = re.search(r'TUNNEL_TOKEN=(.*)', content)
            if match and match.group(1).strip() and not match.group(1).startswith("ey..."):
                tunnel_token = match.group(1)
                print_success("Token Cloudflare trouvé dans .env")
    
    if not tunnel_token:
        console.print("[yellow]  ➜ Le token est nécessaire pour la sécurité (https://one.dash.cloudflare.com/)[/yellow]")
        tunnel_token = Prompt.ask("    Collez votre Cloudflare Tunnel Token (ou Enter pour passer)")
        
        if tunnel_token:
            # Check if .env exists to determine append mode or creation but we want to preserve other vars potentially so let's read it all first or just append. 
            # Simplified approach: If no env file, we create it. If env file exists, we replace or append.
            # actually we will handle full write later or just update token here?
            # Let's rely on the final write step for everything essentially, but we need it for docker up ? NO, docker up needs it.
            # So we must write it now if it was missing.
             with open(ENV_FILE, 'a+') as f:
                f.seek(0)
                if "TUNNEL_TOKEN=" not in f.read():
                     f.write(f"\nTUNNEL_TOKEN={tunnel_token}\n")
             print_success("Token sauvegardé")
        else:
            console.print("[bold red]    Attention: Le tunnel ne fonctionnera pas sans token.[/bold red]")

    # 3. Start Stack
    print_step("Démarrage de la stack")

    # Les téléchargements passent par le VPN (gluetun) : pas de VPN, pas de démarrage
    if not os.path.exists(os.path.join(ROOT_DIR, "vpn.env")):
        print_error("vpn.env manquant : copiez vpn.env.example en vpn.env et remplissez-le")
        sys.exit(1)

    # Using a Group for cleaner layout or just simple Progress
    # Let's keep it simple but with better indentation
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=False, # Keep the final state visible
    ) as progress:
        task = progress.add_task(description="  Lancement des conteneurs...", total=None)
        try:
            subprocess.check_call(f"{COMPOSE} up -d", shell=True, cwd=ROOT_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            progress.update(task, completed=True, description="  [green]Conteneurs lancés[/green]")
        except:
            progress.stop()
            print_error("Erreur lors du démarrage des conteneurs")
            sys.exit(1)

        task2 = progress.add_task(description="  Attente de l'initialisation des apps...", total=30)
        for _ in range(30):
            time.sleep(1)
            progress.advance(task2)
        progress.update(task2, description="  [green]Initialisation terminée[/green]")

    # 4. Harvest API Keys
    print_step("Récupération automatique des Clés API")
    
    radarr_key = extract_api_key_from_xml(os.path.join(CONFIG_DIR, "radarr", "config.xml"))
    sonarr_key = extract_api_key_from_xml(os.path.join(CONFIG_DIR, "sonarr", "config.xml"))
    
    if radarr_key: print_success(f"Radarr Key: [dim]{radarr_key[:5]}...[/dim]")
    else: print_error("Radarr Key non trouvée")

    if sonarr_key: print_success(f"Sonarr Key: [dim]{sonarr_key[:5]}...[/dim]")
    else: print_error("Sonarr Key non trouvée")

    # 5. Extract qBittorrent Password from logs
    print_step("Sécurité qBittorrent")
    qbit_pass = ""
    try:
        logs = subprocess.check_output("docker logs qbittorrent 2>&1", shell=True).decode('utf-8')
        match = re.search(r'temporary password (?:for the web UI is|is provided for this session): (\S+)', logs)
        if match:
            qbit_pass = match.group(1)
            print_success(f"Mot de passe temporaire: [bold cyan]{qbit_pass}[/bold cyan]")
            console.print("[yellow]    ➜ Pensez à le changer dans l'interface qBittorrent ![/yellow]")
        else:
            console.print("[dim]    Mot de passe non trouvé dans les logs (déjà changé ?)[/dim]")
    except:
        pass

    # 6. Generate Global .env Configuration
    print_step("Génération de la configuration .env")
    
    # Defaults
    current_config = {
        "JELLYFIN_API_KEY": "",
        "RADARR_API_KEY": "",
        "SONARR_API_KEY": "",
        "QBIT_USERNAME": "admin",
        "QBIT_PASSWORD": "",
        "PUID": "1000",
        "PGID": "1000",
        "TZ": "Europe/Zurich",
        "ROOT_MEDIA_PATH": "/mnt/nvme/streaming-data",
        "TUNNEL_TOKEN": tunnel_token
    }

    # Read existing conf
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, val = line.strip().split('=', 1)
                    current_config[key] = val.strip() # Strip newline

    # Update with harvested keys ONLY if they are found (not None/Empty)
    if radarr_key: current_config["RADARR_API_KEY"] = radarr_key
    if sonarr_key: current_config["SONARR_API_KEY"] = sonarr_key
    if qbit_pass: current_config["QBIT_PASSWORD"] = qbit_pass
    if tunnel_token: current_config["TUNNEL_TOKEN"] = tunnel_token

    env_content = f"""# AUTO-GENERATED BY SETUP.PY
# INFRASTRUCTURE
# Modify these to match your host system
TZ={current_config['TZ']}
PUID={current_config['PUID']}
PGID={current_config['PGID']}
ROOT_MEDIA_PATH={current_config['ROOT_MEDIA_PATH']}
TUNNEL_TOKEN={current_config['TUNNEL_TOKEN']}

# DASHBOARD & SERVICES
RADARR_API_KEY={current_config['RADARR_API_KEY']}
SONARR_API_KEY={current_config['SONARR_API_KEY']}
JELLYFIN_API_KEY={current_config['JELLYFIN_API_KEY']}
QBIT_USERNAME={current_config['QBIT_USERNAME']}
QBIT_PASSWORD={current_config['QBIT_PASSWORD']}
"""
    
    with open(ENV_FILE, 'w') as f:
        f.write(env_content)
    print_success(".env global mis à jour")

    # Remove old dashboard env file if exists
    if os.path.exists(DASHBOARD_ENV_FILE):
        try:
            os.remove(DASHBOARD_ENV_FILE)
        except:
            pass

    if not current_config['JELLYFIN_API_KEY']:
        console.print(Panel(
            "[bold yellow]Action requise : Clé API Jellyfin[/bold yellow]\n"
            "1. Créez un compte sur http://localhost:8096\n"
            "2. Allez dans Dashboard > Clés API > Créer\n"
            "3. Ajoutez la clé dans le fichier .env (JELLYFIN_API_KEY=...)",
            border_style="yellow"
        ))

    # 7. Restart Dashboard to apply changes
    print_step("Redémarrage du Dashboard")
    try:
        subprocess.check_call(f"{COMPOSE} up -d --force-recreate dashboard", shell=True, cwd=ROOT_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print_success("Dashboard redémarré avec la nouvelle config")
    except:
        print_error("Echec du redémarrage du dashboard")

    # 8. Final Message
    console.print()
    console.print(Panel(
        Align.center("[bold green]INSTALLATION TERMINÉE ![/bold green]\n\n"
        "Accès aux services :\n"
        " 🖥️  [bold]Dashboard[/bold]    http://localhost:8090\n"
        " 🍿 [bold]Jellyfin[/bold]     http://localhost:8096\n"
        " 🎬 [bold]Radarr[/bold]       http://localhost:7878\n"
        " 📺 [bold]Sonarr[/bold]       http://localhost:8989\n"
        " ⬇️  [bold]qBittorrent[/bold]  http://localhost:8085", vertical="middle"),
        title="Succès",
        subtitle="Bon streaming !",
        border_style="green",
        expand=False
    ))

if __name__ == "__main__":
    main()
