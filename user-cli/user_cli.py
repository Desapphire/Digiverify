#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║             Squrify User CLI — personal Command                ║
║        Blockchain-Powered Land Registry for Everyone         ║
╚══════════════════════════════════════════════════════════════╝

Manage your properties, initiate sales, and secure your identity
directly from the command line.
"""

import os
import sys
import json
import time
import getpass
import platform
from datetime import datetime

import click
import requests
import jwt
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.prompt import Prompt, Confirm
from rich import box
from rich.progress import Progress, SpinnerColumn, TextColumn

# ── Load Environment ─────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000/api")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), ".user_token")

console = Console()

# ══════════════════════════════════════════════════════════════
#  Token & Auth Helpers
# ══════════════════════════════════════════════════════════════

def save_token(token: str):
    """Persist JWT token to a local file."""
    with open(TOKEN_FILE, "w") as f:
        f.write(token)


def load_token() -> str | None:
    """Load saved JWT token."""
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE, "r") as f:
        return f.read().strip()


def get_token_or_die() -> str:
    """Get stored token or exit with an error."""
    token = load_token()
    if not token:
        console.print(
            "\n[bold red]✖ Not authenticated.[/bold red] "
            "Run [cyan]python user_cli.py login[/cyan] first.\n"
        )
        sys.exit(1)

    # Simple expiry check (decode only, no verify)
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        exp = payload.get("exp")
        if exp and exp < time.time():
            console.print(
                "\n[bold red]✖ Session expired.[/bold red] "
                "Run [cyan]python user_cli.py login[/cyan] again.\n"
            )
            sys.exit(1)
    except Exception:
        pass

    return token


def auth_headers(token: str = None) -> dict:
    """Build Authorization header."""
    t = token or load_token()
    headers = {"Content-Type": "application/json"}
    if t:
        headers["Authorization"] = f"Bearer {t}"
    return headers


def api_request(method: str, path: str, data: dict | None = None, params: dict | None = None, auth=True):
    """Make an API request and handle errors."""
    url = f"{API_BASE}{path}"
    headers = auth_headers() if auth else {"Content-Type": "application/json"}

    try:
        resp = requests.request(method, url, json=data, params=params, headers=headers, timeout=15)
    except requests.ConnectionError:
        console.print(f"\n[bold red]✖ Cannot connect to API at {API_BASE}[/bold red]")
        console.print("  Make sure the backend server is running.\n")
        sys.exit(1)

    try:
        result = resp.json()
    except:
        result = {"message": resp.text}

    if not resp.ok:
        msg = result.get("message", result.get("error", "Unknown error"))
        console.print(f"\n[bold red]✖ Error ({resp.status_code}):[/bold red] {msg}")
        if "errors" in result and isinstance(result["errors"], list):
            for err in result["errors"]:
                console.print(f"  - {err.get('field', '?')}: {err.get('message', '')}")
        return None

    return result


def show_banner():
    """Display the CLI banner."""
    banner = Text()
    banner.append("╔══════════════════════════════════════════════════╗\n", style="bold green")
    banner.append("║           Squrify User Command Center            ║\n", style="bold green")
    banner.append("║    Secure Blockchain-Based Land Registry         ║\n", style="bold green")
    banner.append("╚══════════════════════════════════════════════════╝", style="bold green")
    console.print(banner)


def print_json_panel(title: str, data: dict | None):
    """Pretty-print a dict as a panel."""
    if data is None:
        return
    formatted = json.dumps(data, indent=2, default=str)
    console.print(Panel(formatted, title=f"[bold cyan]{title}[/bold cyan]", border_style="cyan", expand=False))


def print_success(msg: str):
    console.print(f"\n[bold green]✔ {msg}[/bold green]\n")


# ══════════════════════════════════════════════════════════════
#  CLI Root
# ══════════════════════════════════════════════════════════════

@click.group()
def cli():
    """
    🏡 Squrify User CLI — Manage your land assets on the blockchain.
    """
    pass


# ══════════════════════════════════════════════════════════════
#  AUTH COMMANDS
# ══════════════════════════════════════════════════════════════

@cli.command()
@click.option("--email", "-e", help="User email address")
@click.option("--password", "-p", help="User password")
def login(email, password):
    """🔐 Login to your account."""
    show_banner()
    console.print("\n[bold yellow]🔐 Secure Login[/bold yellow]\n")

    if not email:
        email = Prompt.ask("[cyan]Email[/cyan]")
    if not password:
        password = getpass.getpass("Password: ")

    try:
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as progress:
            progress.add_task(description="Authenticating...", total=None)
            resp = requests.post(
                f"{API_BASE}/auth/login-password",
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
    except requests.exceptions.ConnectionError:
        console.print(f"\n[bold red]✖ Cannot connect to API at {API_BASE}[/bold red]")
        console.print("  Make sure the backend server is running (npm start).\n")
        return
    except Exception as e:
        console.print(f"\n[bold red]✖ An unexpected error occurred:[/bold red] {e}\n")
        return

    if not resp.ok:
        try:
            result = resp.json()
        except:
            result = {}
        msg = result.get("message", "Login failed")
        console.print(f"\n[bold red]✖ {msg}[/bold red]\n")
        return

    result = resp.json()
    token = result.get("data", {}).get("accessToken")

    if not token:
        console.print("[bold red]✖ No token received from server.[/bold red]\n")
        return

    save_token(token)
    print_success("Logged in successfully! Session saved.")


@cli.command()
def logout():
    """🚪 Logout and clear local session."""
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    print_success("Logged out. Local token cleared.")


@cli.command()
def register():
    """📝 Create a new account."""
    show_banner()
    console.print("\n[bold yellow]📝 Account Registration[/bold yellow]\n")

    name = Prompt.ask("[cyan]Full Name[/cyan]")
    email = Prompt.ask("[cyan]Email address[/cyan]")
    password = Prompt.ask("[cyan]Set Password[/cyan]", password=True)
    wallet = Prompt.ask("[cyan]Wallet Address[/cyan]")
    role = Prompt.ask("[cyan]Role[/cyan]", choices=["user", "agent"], default="user")
    phone = Prompt.ask("[cyan]Phone (optional)[/cyan]", default="")
    govt_id = Prompt.ask("[cyan]Government ID (optional)[/cyan]", default="")
    birthdate = Prompt.ask("[cyan]Birthdate (YYYY-MM-DD, optional)[/cyan]", default="")

    payload = {
        "name": name,
        "email": email,
        "password": password,
        "walletAddress": wallet,
        "role": role,
    }
    if phone: payload["phone"] = phone
    if govt_id: payload["governmentId"] = govt_id
    if birthdate: payload["birthdate"] = birthdate

    result = api_request("POST", "/onboarding/register", data=payload, auth=False)
    if result:
        print_success("Registration successful! You can now login.")


@cli.command()
def whoami():
    """👤 Show current user identity."""
    get_token_or_die()
    result = api_request("GET", "/auth/me")
    if result:
        data = result.get("data", result)
        table = Table(title="Your Identity", box=box.ROUNDED, border_style="cyan")
        table.add_column("Field", style="bold")
        table.add_column("Value")
        for key in ["id", "name", "email", "role", "walletAddress", "kycStatus", "isActive"]:
            val = data.get(key, "—")
            table.add_row(key, str(val))
        console.print(table)


# ══════════════════════════════════════════════════════════════
#  PROFILE & KYC
# ══════════════════════════════════════════════════════════════

@cli.group()
def profile():
    """👤 Manage your profile and KYC."""
    pass

@profile.command("view")
def profile_view():
    """View your full profile."""
    result = api_request("GET", "/users/profile")
    if result:
        print_json_panel("Profile Details", result.get("data"))

@profile.command("bind-face")
@click.argument("face_hash")
def profile_bind_face(face_hash):
    """🔗 Bind your Face ID hash to your profile."""
    if Confirm.ask(f"Bind Face ID hash [cyan]{face_hash}[/cyan]?"):
        result = api_request("PUT", "/users/face-id", data={"faceIdHash": face_hash})
        if result:
            print_success("Face ID bound successfully.")

@profile.command("submit-kyc")
@click.argument("document_hash")
def profile_submit_kyc(document_hash):
    """🆔 Submit KYC document hash for verification."""
    if Confirm.ask(f"Submit KYC document hash [cyan]{document_hash}[/cyan]?"):
        result = api_request("POST", "/users/kyc", data={"kycDocumentHash": document_hash})
        if result:
            print_success("KYC submission successful. Awaiting verification.")


# ══════════════════════════════════════════════════════════════
#  PROPERTY COMMANDS
# ══════════════════════════════════════════════════════════════

@cli.group()
def property():
    """🏠 Manage your land properties."""
    pass

@property.command("register")
def property_register():
    """🏠 Register a new land property."""
    console.print("\n[bold yellow]🏠 Property Registration[/bold yellow]\n")
    survey = Prompt.ask("[cyan]Survey Number[/cyan]")
    area = float(Prompt.ask("[cyan]Area (sqft)[/cyan]"))
    address = Prompt.ask("[cyan]Address Line[/cyan]")
    state = Prompt.ask("[cyan]State[/cyan]")
    district = Prompt.ask("[cyan]District[/cyan]")

    payload = {
        "surveyNumber": survey,
        "areaSqft": area,
        "addressLine": address,
        "state": state,
        "district": district
    }

    result = api_request("POST", "/properties", data=payload)
    if result:
        print_success("Property registration request submitted!")
        print_json_panel("Application Result", result.get("data"))

@property.command("list")
def property_list():
    """📋 List your registered properties."""
    result = api_request("GET", "/properties/my")
    if result:
        data = result.get("data", [])
        if not data:
            console.print("[dim]You have no registered properties.[/dim]")
            return
        table = Table(title="Your Properties", box=box.ROUNDED, border_style="green")
        table.add_column("ID", style="dim")
        table.add_column("Code", style="bold")
        table.add_column("Survey #")
        table.add_column("District")
        table.add_column("Status", style="bold")
        for p in data:
            status = p.get("status", "pending")
            style = {"active": "green", "frozen": "red", "pending": "yellow"}.get(status, "white")
            table.add_row(
                str(p.get("id")),
                p.get("propertyCode", "—"),
                p.get("surveyNumber", "—"),
                p.get("district", "—"),
                f"[{style}]{status}[/{style}]"
            )
        console.print(table)

@property.command("view")
@click.argument("property_id")
def property_view(property_id):
    """🔍 View details of a specific property."""
    result = api_request("GET", f"/properties/{property_id}")
    if result:
        print_json_panel("Property Details", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  SALE COMMANDS
# ══════════════════════════════════════════════════════════════

@cli.group()
def sale():
    """💰 Manage land sale transactions."""
    pass

@sale.command("initiate")
@click.argument("property_id")
@click.argument("buyer_wallet")
@click.argument("price")
def sale_initiate(property_id, buyer_wallet, price):
    """💰 Start a sale transaction for your property."""
    if Confirm.ask(f"Initiate sale for property [cyan]{property_id}[/cyan] to [cyan]{buyer_wallet}[/cyan] for [bold]₹{price}[/bold]?"):
        payload = {
            "propertyId": property_id,
            "buyerWallet": buyer_wallet,
            "salePrice": float(price)
        }
        result = api_request("POST", "/sales", data=payload)
        if result:
            print_success("Sale transaction initiated!")
            print_json_panel("Sale Data", result.get("data"))

@sale.command("list")
def sale_list():
    """📋 List your active and past sale transactions."""
    result = api_request("GET", "/sales/my")
    if result:
        data = result.get("data", [])
        if not data:
            console.print("[dim]You have no sale transactions.[/dim]")
            return
        table = Table(title="Your Sales", box=box.ROUNDED, border_style="yellow")
        table.add_column("ID", style="dim")
        table.add_column("Status", style="bold")
        table.add_column("Price")
        table.add_column("Role")
        table.add_column("Property Code")
        
        my_addr = api_request("GET", "/auth/me")["data"]["walletAddress"]

        for s in data:
            role = "Seller" if s.get("sellerWallet") == my_addr else "Buyer"
            table.add_row(
                str(s.get("id"))[:10],
                s.get("status", "—"),
                str(s.get("salePrice")),
                role,
                s.get("Property", {}).get("propertyCode", "—")
            )
        console.print(table)

@sale.command("sign")
@click.argument("sale_id")
@click.argument("signature_hash")
def sale_sign(sale_id, signature_hash):
    """✍️ Digitally sign a sale transaction."""
    if Confirm.ask(f"Sign sale [cyan]{sale_id}[/cyan]?"):
        result = api_request("POST", f"/sales/{sale_id}/sign", data={"signatureHash": signature_hash})
        if result:
            print_success("Sale signed successfully.")

@sale.command("view")
@click.argument("sale_id")
def sale_view(sale_id):
    """🔍 View details of a specific sale."""
    result = api_request("GET", f"/sales/{sale_id}")
    if result:
        print_json_panel("Sale Details", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  BANK & RECOVERY
# ══════════════════════════════════════════════════════════════

@cli.group()
def bank():
    """🏦 Manage bank fund blocks for transactions."""
    pass

@bank.command("request-block")
@click.argument("transaction_id")
@click.argument("amount")
def bank_request_block(transaction_id, amount):
    """💸 Request a fund block for a specific transaction."""
    if Confirm.ask(f"Request a fund block of [bold]₹{amount}[/bold] for transaction [cyan]{transaction_id}[/cyan]?"):
        payload = {"transactionId": transaction_id, "blockAmount": float(amount)}
        result = api_request("POST", "/bank/fund-block", data=payload)
        if result:
            print_success("Fund block request submitted to bank!")
            print_json_panel("Block Details", result.get("data"))


@cli.group()
def recovery():
    """🔄 Wallet and account recovery."""
    pass

@recovery.command("request")
@click.argument("old_wallet")
@click.argument("reason")
def recovery_request(old_wallet, reason):
    """🔄 Request wallet recovery for a lost account."""
    if Confirm.ask(f"Request recovery from old wallet [cyan]{old_wallet}[/cyan]?"):
        payload = {"oldWallet": old_wallet, "reason": reason}
        result = api_request("POST", "/users/recovery/request", data=payload)
        if result:
            print_success("Recovery request submitted. Admin will review soon.")


# ══════════════════════════════════════════════════════════════
#  DASHBOARD & MISC
# ══════════════════════════════════════════════════════════════

@cli.command()
def dashboard():
    """📊 Personal interaction dashboard."""
    get_token_or_die()
    show_banner()
    
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as progress:
        progress.add_task(description="Gathering intel...", total=None)
        me = api_request("GET", "/auth/me")["data"]
        props = api_request("GET", "/properties/my")["data"]
        sales = api_request("GET", "/sales/my")["data"]

    # Profile Section
    name = me.get("name")
    role = me.get("role")
    kyc = me.get("kycStatus")
    kyc_style = {"verified": "bold green", "pending": "bold yellow"}.get(kyc, "bold red")
    
    console.print(f"\n[bold]Welcome back, {name}![/bold] ({role})")
    console.print(f"Status: [{kyc_style}]{kyc.upper()}[/{kyc_style}]\n")

    # Stats
    cols = Table.grid(expand=True)
    cols.add_column(ratio=1)
    cols.add_column(ratio=1)
    
    prop_count = len(props)
    active_sales = len([s for s in sales if s.get("status") not in ["completed", "cancelled"]])
    
    cols.add_row(
        Panel(f"[bold green]{prop_count}[/bold green]", title="Properties Owned", border_style="green"),
        Panel(f"[bold yellow]{active_sales}[/bold yellow]", title="Active Sales", border_style="yellow")
    )
    console.print(cols)

    # Recent activity or tips
    if kyc != "verified":
        console.print(Panel("Your KYC is not yet verified. You cannot initiate sales until verified.", 
                            title="[bold red]Action Required[/bold red]", border_style="red"))
    
    console.print(f"\n[dim]Device: {platform.node()}[/dim]")
    console.print(f"[dim]Time  : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/dim]\n")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        dashboard()
    else:
        cli()
