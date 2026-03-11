#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║             Squrify Admin CLI — Command Center               ║
║        Government-Grade Land Registry Administration         ║
╚══════════════════════════════════════════════════════════════╝

A powerful command-line tool for administrators to manage the
Squrify Land Registry system. Supports all admin API operations
including KYC, property, sale, court, bank, and audit management.

Usage:
    python admin_cli.py login
    python admin_cli.py [command] [options]
    python admin_cli.py --help
"""

import os
import sys
import json
import time
import getpass
from datetime import datetime, timezone

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

# ── Load Environment ─────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

API_BASE = os.getenv("API_BASE_URL", "http://localhost:5000/api")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_jwt_secret_change_in_production")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), ".admin_token")

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
            "Run [cyan]python admin_cli.py login[/cyan] first.\n"
        )
        sys.exit(1)

    # Check expiry
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        exp = payload.get("exp")
        if exp and exp < time.time():
            console.print(
                "\n[bold red]✖ Token expired.[/bold red] "
                "Run [cyan]python admin_cli.py login[/cyan] again.\n"
            )
            sys.exit(1)
    except Exception:
        pass

    return token


def auth_headers(token: str = None) -> dict:
    """Build Authorization header."""
    t = token or get_token_or_die()
    return {
        "Authorization": f"Bearer {t}",
        "Content-Type": "application/json",
    }


def api_request(method: str, path: str, data: dict = None, params: dict = None, token: str = None):
    """Make an API request and handle errors."""
    url = f"{API_BASE}{path}"
    headers = auth_headers(token)

    try:
        resp = requests.request(method, url, json=data, params=params, headers=headers, timeout=15)
    except requests.ConnectionError:
        console.print(f"\n[bold red]✖ Cannot connect to API at {API_BASE}[/bold red]")
        console.print("  Make sure the backend server is running.\n")
        sys.exit(1)

    result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"message": resp.text}

    if not resp.ok:
        msg = result.get("message", result.get("error", "Unknown error"))
        console.print(f"\n[bold red]✖ API Error ({resp.status_code}):[/bold red] {msg}\n")
        return None

    return result


def show_banner():
    """Display the CLI banner."""
    banner = Text()
    banner.append("╔══════════════════════════════════════════════════╗\n", style="bold cyan")
    banner.append("║         Squrify Admin Command Center             ║\n", style="bold cyan")
    banner.append("║   Government-Grade Land Registry Administration  ║\n", style="bold cyan")
    banner.append("╚══════════════════════════════════════════════════╝", style="bold cyan")
    console.print(banner)


def print_json_panel(title: str, data: dict):
    """Pretty-print a dict as a panel."""
    if data is None:
        return
    formatted = json.dumps(data, indent=2, default=str)
    console.print(Panel(formatted, title=f"[bold green]{title}[/bold green]", border_style="green", expand=False))


def print_success(msg: str):
    console.print(f"\n[bold green]✔ {msg}[/bold green]\n")


# ══════════════════════════════════════════════════════════════
#  CLI Root
# ══════════════════════════════════════════════════════════════

@click.group()
def cli():
    """
    🏛️  Squrify Admin CLI — Manage users, properties, sales, and more.

    Run 'login' first to authenticate, then use any admin command.
    """
    pass


# ══════════════════════════════════════════════════════════════
#  LOGIN
# ══════════════════════════════════════════════════════════════

@cli.command()
@click.option("--email", "-e", help="Admin email address")
@click.option("--password", "-p", help="Admin password (will prompt if not provided)")
def login(email, password):
    """🔐 Authenticate as an administrator."""
    show_banner()
    console.print("\n[bold yellow]🔐 Admin Login[/bold yellow]\n")

    if not email:
        email = os.getenv("ADMIN_EMAIL") or Prompt.ask("[cyan]Email[/cyan]")
    if not password:
        password = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Password: ")

    # Step 1: Login via email/password
    resp = requests.post(
        f"{API_BASE}/auth/login-password",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json"},
        timeout=15,
    )

    if not resp.ok:
        result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        msg = result.get("message", "Login failed")
        console.print(f"\n[bold red]✖ {msg}[/bold red]\n")
        return

    result = resp.json()
    token = result.get("data", {}).get("accessToken") or result.get("data", {}).get("token") or result.get("token")

    if not token:
        console.print("[bold red]✖ No token received from server.[/bold red]\n")
        return

    # Decode and show info
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        role = payload.get("role", "unknown")
        admin_roles = ["authority", "court", "bank_admin", "super_admin"]
        if role not in admin_roles:
            console.print(f"\n[bold red]✖ Access denied. Role '{role}' is not an admin role.[/bold red]")
            console.print(f"  Required roles: {', '.join(admin_roles)}\n")
            return
        save_token(token)
        console.print(f"  [dim]Role  :[/dim] [bold]{role}[/bold]")
        console.print(f"  [dim]Email :[/dim] {payload.get('email', 'N/A')}")
        console.print(f"  [dim]UserID:[/dim] {payload.get('id', 'N/A')}")
        print_success("Authenticated successfully!")
    except Exception:
        save_token(token)
        print_success("Authenticated (token saved).")


@cli.command()
def logout():
    """🚪 Clear saved authentication."""
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    print_success("Logged out. Token cleared.")


@cli.command()
def whoami():
    """👤 Show current admin identity."""
    token = get_token_or_die()
    result = api_request("GET", "/auth/me", token=token)
    if result:
        data = result.get("data", result)
        table = Table(title="Admin Identity", box=box.ROUNDED, border_style="cyan")
        table.add_column("Field", style="bold")
        table.add_column("Value")
        for key in ["id", "name", "email", "role", "walletAddress", "kycStatus", "isActive"]:
            val = data.get(key, "—")
            table.add_row(key, str(val))
        console.print(table)


# ══════════════════════════════════════════════════════════════
#  KYC MANAGEMENT
# ══════════════════════════════════════════════════════════════

@cli.group()
def kyc():
    """🆔 KYC verification management."""
    pass


@kyc.command("list")
@click.option("--status", "-s", type=click.Choice(["pending", "verified", "rejected"]), default="pending")
def kyc_list(status):
    """List users by KYC status."""
    params = {}
    if status:
        params["kycStatus"] = status
    result = api_request("GET", "/admin/users", params=params)
    if result:
        data = result.get("data", [])
        if not data:
            console.print(f"[dim]No users found with KYC status '{status}'.[/dim]")
            return
        table = Table(title=f"Users (KYC: {status})", box=box.ROUNDED, border_style="cyan")
        table.add_column("#", style="dim")
        table.add_column("User ID", style="bold")
        table.add_column("Name")
        table.add_column("Email", style="cyan")
        table.add_column("Wallet", max_width=18)
        table.add_column("Role")
        table.add_column("KYC Status", style="bold")
        table.add_column("Active")
        for i, u in enumerate(data, 1):
            kyc = u.get("kycStatus", "—")
            kyc_style = {"pending": "yellow", "verified": "green", "rejected": "red"}.get(kyc, "white")
            table.add_row(
                str(i),
                str(u.get("id", "")),
                u.get("name", "—") or "—",
                u.get("email", "—") or "—",
                ((u.get("walletAddress", "—") or "—")[:18] + "…"),
                u.get("role", "—"),
                f"[{kyc_style}]{kyc}[/{kyc_style}]",
                "✅" if u.get("isActive") else "❌",
            )
        console.print(table)


@kyc.command("approve")
@click.argument("user_id")
def kyc_approve(user_id):
    """✅ Approve a user's KYC. Requires USER_ID."""
    if Confirm.ask(f"Approve KYC for user [cyan]{user_id}[/cyan]?"):
        result = api_request("PUT", f"/admin/kyc/{user_id}/approve")
        if result:
            print_success(f"KYC approved for user {user_id}")
            print_json_panel("User Data", result.get("data"))


@kyc.command("reject")
@click.argument("user_id")
def kyc_reject(user_id):
    """❌ Reject a user's KYC. Requires USER_ID."""
    if Confirm.ask(f"Reject KYC for user [cyan]{user_id}[/cyan]?"):
        result = api_request("PUT", f"/admin/kyc/{user_id}/reject")
        if result:
            print_success(f"KYC rejected for user {user_id}")
            print_json_panel("User Data", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  PROPERTY MANAGEMENT
# ══════════════════════════════════════════════════════════════

@cli.group()
def property():
    """🏠 Property management commands."""
    pass


@property.command("list")
@click.option("--status", "-s", help="Filter by status (active, frozen, under_dispute)")
@click.option("--district", "-d", help="Filter by district")
@click.option("--state", help="Filter by state")
@click.option("--limit", "-l", default=20, help="Max results")
def property_list(status, district, state, limit):
    """List properties with optional filters."""
    params = {"limit": limit}
    if status:
        params["status"] = status
    if district:
        params["district"] = district
    if state:
        params["state"] = state

    result = api_request("GET", "/properties/search", params=params)
    if result:
        data = result.get("data", [])
        if not data:
            console.print("[dim]No properties found.[/dim]")
            return
        table = Table(title="Properties", box=box.ROUNDED, border_style="cyan", show_lines=False)
        table.add_column("#", style="dim")
        table.add_column("ID", style="bold")
        table.add_column("Code")
        table.add_column("Survey #")
        table.add_column("District")
        table.add_column("State")
        table.add_column("Status", style="bold")
        table.add_column("Owner Wallet")
        for i, p in enumerate(data, 1):
            status_style = {
                "active": "green",
                "frozen": "red",
                "under_dispute": "yellow",
            }.get(p.get("status", ""), "white")
            
            owner_wallet = p.get("ownerWallet", "") or "—"
            if len(owner_wallet) > 20:
                owner_wallet = f"{owner_wallet[:10]}...{owner_wallet[-8:]}"

            table.add_row(
                str(i),
                str(p.get("id", "")),
                p.get("propertyCode", "—"),
                p.get("surveyNumber", "—"),
                p.get("district", "—"),
                p.get("state", "—"),
                f"[{status_style}]{p.get('status', '—')}[/{status_style}]",
                owner_wallet,
            )
        console.print(table)


@property.command("view")
@click.argument("property_id")
def property_view(property_id):
    """View full details of a property."""
    result = api_request("GET", f"/properties/{property_id}")
    if result:
        print_json_panel("Property Details", result.get("data"))


@property.command("approve")
@click.argument("property_id")
def property_approve(property_id):
    """✅ Approve a registered property."""
    if Confirm.ask(f"Approve property [cyan]{property_id}[/cyan]?"):
        result = api_request("PUT", f"/admin/property/{property_id}/approve")
        if result:
            print_success(f"Property {property_id} approved!")
            print_json_panel("Property", result.get("data"))


@property.command("set-encumbrance")
@click.argument("property_id")
@click.option("--set/--clear", default=True, help="Set or clear encumbrance flag")
def property_encumbrance(property_id, set):
    """🔒 Set or clear encumbrance on a property."""
    action = "Set" if set else "Clear"
    if Confirm.ask(f"{action} encumbrance on property [cyan]{property_id}[/cyan]?"):
        result = api_request("PUT", f"/admin/property/{property_id}/encumbrance", data={"encumbrance": set})
        if result:
            print_success(f"Encumbrance {'set' if set else 'cleared'} on property {property_id}")
            print_json_panel("Property", result.get("data"))


@property.command("freeze")
@click.argument("property_id")
@click.option("--order-id", required=True, help="Court order reference ID")
@click.option("--reason", "-r", required=True, help="Reason for freezing")
def property_freeze(property_id, order_id, reason):
    """🧊 Freeze a property (Court order)."""
    if Confirm.ask(f"Freeze property [cyan]{property_id}[/cyan] by court order?"):
        result = api_request("POST", "/admin/property/freeze", data={
            "propertyId": property_id,
            "freezeOrderId": order_id,
            "reason": reason,
        })
        if result:
            print_success(f"Property {property_id} frozen!")
            print_json_panel("Result", result.get("data"))


@property.command("unfreeze")
@click.argument("freeze_order_id")
def property_unfreeze(freeze_order_id):
    """🔓 Reverse a freeze order (Court)."""
    if Confirm.ask(f"Reverse freeze order [cyan]{freeze_order_id}[/cyan]?"):
        result = api_request("POST", f"/admin/property/reverse-freeze/{freeze_order_id}")
        if result:
            print_success(f"Freeze order {freeze_order_id} reversed!")
            print_json_panel("Result", result.get("data"))


@property.command("force-transfer")
@click.argument("property_id")
@click.option("--to-wallet", required=True, help="New owner's wallet address")
@click.option("--order-id", required=True, help="Court order reference")
@click.option("--reason", "-r", required=True, help="Reason for force transfer")
def property_force_transfer(property_id, to_wallet, order_id, reason):
    """⚖️ Force-transfer property ownership (Court order)."""
    console.print(f"\n[bold red]⚠️  DESTRUCTIVE ACTION[/bold red]")
    console.print(f"  Property  : {property_id}")
    console.print(f"  To Wallet : {to_wallet}")
    console.print(f"  Court Order: {order_id}")
    console.print(f"  Reason    : {reason}\n")
    if Confirm.ask("[bold red]Are you absolutely sure?[/bold red]"):
        result = api_request("POST", "/admin/property/force-transfer", data={
            "propertyId": property_id,
            "newOwnerWallet": to_wallet,
            "courtOrderId": order_id,
            "reason": reason,
        })
        if result:
            print_success("Force transfer completed!")
            print_json_panel("Result", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  SALE MANAGEMENT
# ══════════════════════════════════════════════════════════════

@cli.group()
def sale():
    """💰 Sale transaction management."""
    pass


@sale.command("list")
@click.option("--wallet", "-w", help="Filter by buyer/seller wallet")
@click.option("--property-id", "-p", help="Filter by property ID")
def sale_list(wallet, property_id):
    """List sale transactions."""
    if property_id:
        result = api_request("GET", f"/sales/property/{property_id}")
    elif wallet:
        result = api_request("GET", f"/sales/wallet/{wallet}")
    else:
        result = api_request("GET", "/admin/audit", params={"actionType": "SALE_INITIATED", "limit": 50})
        if result:
            data = result.get("data", [])
            table = Table(title="Recent Sale Activity", box=box.ROUNDED, border_style="cyan")
            table.add_column("#", style="dim")
            table.add_column("Sale ID")
            table.add_column("Actor Wallet")
            table.add_column("Action")
            table.add_column("Date")
            for i, entry in enumerate(data, 1):
                table.add_row(
                    str(i),
                    str(entry.get("entity_id", entry.get("entityId", "—")))[:10],
                    str(entry.get("actor_wallet", entry.get("actorWallet", "—")))[:15] + "…",
                    entry.get("action_type", entry.get("actionType", "—")),
                    str(entry.get("created_at", entry.get("createdAt", "—")))[:19],
                )
            console.print(table)
            return

    if result:
        data = result.get("data", [])
        if not data:
            console.print("[dim]No sales found.[/dim]")
            return
        if isinstance(data, dict):
            data = [data]
        table = Table(title="Sales", box=box.ROUNDED, border_style="cyan")
        table.add_column("#", style="dim")
        table.add_column("ID", max_width=10)
        table.add_column("Status", style="bold")
        table.add_column("Price")
        table.add_column("Buyer", max_width=15)
        table.add_column("Seller", max_width=15)
        for i, s in enumerate(data, 1):
            table.add_row(
                str(i),
                str(s.get("id", ""))[:10],
                s.get("status", "—"),
                str(s.get("salePrice", "—")),
                (s.get("buyerWallet", "—") or "—")[:15],
                (s.get("sellerWallet", "—") or "—")[:15],
            )
        console.print(table)


@sale.command("view")
@click.argument("sale_id")
def sale_view(sale_id):
    """View full sale transaction details."""
    result = api_request("GET", f"/sales/{sale_id}")
    if result:
        print_json_panel("Sale Transaction", result.get("data"))


@sale.command("approve")
@click.argument("sale_id")
@click.option("--signature", "-s", help="Authority signature hash")
def sale_approve(sale_id, signature):
    """✅ Approve a sale as authority."""
    if Confirm.ask(f"Approve sale [cyan]{sale_id}[/cyan]?"):
        data = {}
        if signature:
            data["signatureHash"] = signature
        result = api_request("POST", f"/admin/sale/{sale_id}/approve", data=data)
        if result:
            print_success(f"Sale {sale_id} approved!")
            print_json_panel("Sale", result.get("data"))


@sale.command("reject")
@click.argument("sale_id")
def sale_reject(sale_id):
    """❌ Reject a sale as authority."""
    if Confirm.ask(f"[bold red]Reject sale [cyan]{sale_id}[/cyan]?[/bold red]"):
        result = api_request("POST", f"/admin/sale/{sale_id}/reject")
        if result:
            print_success(f"Sale {sale_id} rejected!")
            print_json_panel("Sale", result.get("data"))


@sale.command("complete")
@click.argument("sale_id")
def sale_complete(sale_id):
    """🏁 Complete a sale (finalize transfer)."""
    if Confirm.ask(f"Complete sale [cyan]{sale_id}[/cyan]? This will finalize the ownership transfer."):
        result = api_request("POST", f"/admin/sale/{sale_id}/complete")
        if result:
            print_success(f"Sale {sale_id} completed!")
            print_json_panel("Sale", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  BANK / FUND MANAGEMENT
# ══════════════════════════════════════════════════════════════

@cli.group()
def bank():
    """🏦 Bank fund block management."""
    pass


@bank.command("confirm")
@click.argument("fund_block_id")
@click.option("--reference", "-r", required=True, help="Bank reference ID")
def bank_confirm(fund_block_id, reference):
    """✅ Confirm a fund block request."""
    if Confirm.ask(f"Confirm fund block [cyan]{fund_block_id}[/cyan] with reference [cyan]{reference}[/cyan]?"):
        result = api_request("PUT", f"/admin/bank/fund-block/{fund_block_id}/confirm", data={
            "bankReferenceId": reference,
        })
        if result:
            print_success(f"Fund block {fund_block_id} confirmed!")
            print_json_panel("Fund Block", result.get("data"))


@bank.command("release")
@click.argument("fund_block_id")
def bank_release(fund_block_id):
    """💸 Release blocked funds."""
    if Confirm.ask(f"Release funds for block [cyan]{fund_block_id}[/cyan]?"):
        result = api_request("PUT", f"/admin/bank/fund-block/{fund_block_id}/release")
        if result:
            print_success(f"Funds released for block {fund_block_id}!")
            print_json_panel("Fund Block", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  WALLET RECOVERY
# ══════════════════════════════════════════════════════════════

@cli.group()
def recovery():
    """🔄 Wallet recovery management."""
    pass


@recovery.command("pending")
def recovery_pending():
    """List pending wallet recovery requests."""
    result = api_request("GET", "/admin/recovery/pending")
    if result:
        data = result.get("data", [])
        if not data:
            console.print("[dim]No pending recovery requests.[/dim]")
            return
        table = Table(title="Pending Wallet Recoveries", box=box.ROUNDED, border_style="yellow")
        table.add_column("#", style="dim")
        table.add_column("ID", max_width=10)
        table.add_column("User ID", max_width=10)
        table.add_column("Old Wallet", max_width=15)
        table.add_column("Status", style="bold")
        table.add_column("Reason")
        table.add_column("Date")
        for i, r in enumerate(data, 1):
            table.add_row(
                str(i),
                str(r.get("id", ""))[:10],
                str(r.get("userId", ""))[:10],
                (r.get("oldWallet", "—") or "—")[:15] + "…",
                r.get("status", "—"),
                r.get("reason", "—"),
                str(r.get("createdAt", "—"))[:19],
            )
        console.print(table)


@recovery.command("verify")
@click.argument("recovery_id")
def recovery_verify(recovery_id):
    """🔍 Mark identity as verified for a recovery request."""
    if Confirm.ask(f"Verify identity for recovery [cyan]{recovery_id}[/cyan]?"):
        result = api_request("PUT", f"/admin/recovery/{recovery_id}/verify")
        if result:
            print_success(f"Identity verified for recovery {recovery_id}")
            print_json_panel("Recovery", result.get("data"))


@recovery.command("complete")
@click.argument("recovery_id")
@click.option("--new-wallet", required=True, help="New wallet address to assign")
def recovery_complete(recovery_id, new_wallet):
    """✅ Complete a wallet recovery (assign new wallet)."""
    console.print(f"\n  Recovery ID : {recovery_id}")
    console.print(f"  New Wallet  : {new_wallet}\n")
    if Confirm.ask("Complete this wallet recovery?"):
        result = api_request("PUT", f"/admin/recovery/{recovery_id}/complete", data={
            "newWallet": new_wallet,
        })
        if result:
            print_success(f"Wallet recovery {recovery_id} completed!")
            print_json_panel("Recovery", result.get("data"))


@recovery.command("reject")
@click.argument("recovery_id")
def recovery_reject(recovery_id):
    """❌ Reject a wallet recovery request."""
    if Confirm.ask(f"[bold red]Reject recovery [cyan]{recovery_id}[/cyan]?[/bold red]"):
        result = api_request("PUT", f"/admin/recovery/{recovery_id}/reject")
        if result:
            print_success(f"Wallet recovery {recovery_id} rejected.")
            print_json_panel("Recovery", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  USER MANAGEMENT
# ══════════════════════════════════════════════════════════════

@cli.group()
def user():
    """👥 User management commands."""
    pass


@user.command("view")
@click.argument("identifier")
@click.option("--by", type=click.Choice(["id", "email", "wallet"]), default="id", help="Search by field")
def user_view(identifier, by):
    """View a user's profile by ID, email, or wallet."""
    if by == "id":
        result = api_request("GET", f"/users/{identifier}")
    elif by == "email":
        result = api_request("GET", f"/users/by-email/{identifier}")
    elif by == "wallet":
        result = api_request("GET", f"/users/by-wallet/{identifier}")

    if result:
        print_json_panel("User Profile", result.get("data"))


# ══════════════════════════════════════════════════════════════
#  AUDIT LOG
# ══════════════════════════════════════════════════════════════

@cli.group()
def audit():
    """📋 Audit log commands."""
    pass


@audit.command("query")
@click.option("--action", "-a", help="Filter by action type (e.g. KYC_APPROVED, SALE_COMPLETED)")
@click.option("--wallet", "-w", help="Filter by actor wallet")
@click.option("--entity", "-e", help="Filter by entity ID")
@click.option("--start-date", help="Start date (YYYY-MM-DD)")
@click.option("--end-date", help="End date (YYYY-MM-DD)")
@click.option("--limit", "-l", default=25, help="Max results")
def audit_query(action, wallet, entity, start_date, end_date, limit):
    """Query audit logs with filters."""
    params = {"limit": limit}
    if action:
        params["actionType"] = action
    if wallet:
        params["actorWallet"] = wallet
    if entity:
        params["entityId"] = entity
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date

    result = api_request("GET", "/admin/audit", params=params)
    if result:
        data = result.get("data", [])
        if not data:
            console.print("[dim]No audit logs found.[/dim]")
            return
        table = Table(title="Audit Logs", box=box.ROUNDED, border_style="magenta")
        table.add_column("#", style="dim")
        table.add_column("Action", style="bold cyan")
        table.add_column("Actor Wallet", max_width=15)
        table.add_column("Entity ID", max_width=12)
        table.add_column("Entity Type")
        table.add_column("TX Hash", max_width=12)
        table.add_column("Timestamp")
        for i, log in enumerate(data, 1):
            table.add_row(
                str(i),
                log.get("action_type", log.get("actionType", "—")),
                (log.get("actor_wallet", log.get("actorWallet", "—")) or "—")[:15],
                str(log.get("entity_id", log.get("entityId", "—")) or "—")[:12],
                log.get("entity_type", log.get("entityType", "—")) or "—",
                (log.get("tx_hash", log.get("txHash", "—")) or "—")[:12],
                str(log.get("created_at", log.get("createdAt", "—")))[:19],
            )
        console.print(table)


@audit.command("actions")
def audit_actions():
    """Show all available audit action types."""
    actions = [
        ("Auth", ["USER_REGISTERED", "USER_LOGIN", "NONCE_GENERATED"]),
        ("KYC", ["KYC_SUBMITTED", "KYC_APPROVED", "KYC_REJECTED"]),
        ("Property", ["PROPERTY_REGISTERED", "PROPERTY_APPROVED", "PROPERTY_UPDATED",
                       "PROPERTY_FROZEN", "PROPERTY_UNFROZEN", "PROPERTY_DOCUMENT_UPLOADED",
                       "ENCUMBRANCE_SET", "ENCUMBRANCE_CLEARED"]),
        ("Sale", ["SALE_INITIATED", "SALE_BUYER_SIGNED", "SALE_SELLER_SIGNED",
                  "SALE_AUTHORITY_APPROVED", "SALE_COMPLETED", "SALE_CANCELLED", "SALE_FROZEN"]),
        ("Bank", ["FUND_BLOCK_REQUESTED", "FUND_BLOCK_CONFIRMED", "FUND_UNBLOCKED"]),
        ("Court", ["COURT_FREEZE_ISSUED", "COURT_REVERSAL_ISSUED", "COURT_FORCE_TRANSFER"]),
        ("Recovery", ["WALLET_RECOVERY_REQUESTED", "WALLET_RECOVERY_VERIFIED",
                      "WALLET_RECOVERY_COMPLETED", "WALLET_RECOVERY_REJECTED"]),
        ("Ownership", ["OWNERSHIP_TRANSFERRED", "NFT_MINTED", "NFT_FORCE_TRANSFERRED"]),
    ]

    table = Table(title="Available Audit Action Types", box=box.ROUNDED, border_style="magenta")
    table.add_column("Category", style="bold")
    table.add_column("Action Types")
    for category, action_list in actions:
        table.add_row(category, "\n".join(action_list))
    console.print(table)


# ══════════════════════════════════════════════════════════════
#  INTERACTIVE DASHBOARD
# ══════════════════════════════════════════════════════════════

@cli.command()
def dashboard():
    """📊 Launch interactive admin dashboard overview."""
    show_banner()
    token = get_token_or_die()

    console.print("\n[bold yellow]📊 Admin Dashboard — Loading...[/bold yellow]\n")

    # Get current user info
    me = api_request("GET", "/auth/me", token=token)
    if me:
        data = me.get("data", me)
        console.print(Panel(
            f"  👤 [bold]{data.get('name', 'Admin')}[/bold]\n"
            f"  📧 {data.get('email', '—')}\n"
            f"  🏷️  Role: [bold cyan]{data.get('role', '—')}[/bold cyan]\n"
            f"  💳 Wallet: {(data.get('walletAddress', '—') or '—')[:20]}…",
            title="[bold green]Logged In As[/bold green]",
            border_style="green",
            expand=False,
        ))

    # Pending recoveries
    recoveries = api_request("GET", "/admin/recovery/pending", token=token)
    if recoveries:
        rec_data = recoveries.get("data", [])
        console.print(f"\n  🔄 Pending Wallet Recoveries: [bold yellow]{len(rec_data)}[/bold yellow]")

    # Recent audit activity
    recent = api_request("GET", "/admin/audit", params={"limit": 5}, token=token)
    if recent:
        rec_data = recent.get("data", [])
        if rec_data:
            console.print(f"\n  📋 Latest {len(rec_data)} Audit Events:")
            for log in rec_data:
                action = log.get("action_type", log.get("actionType", "—"))
                ts = str(log.get("created_at", log.get("createdAt", "")))[:19]
                console.print(f"     [dim]{ts}[/dim]  [cyan]{action}[/cyan]")

    console.print("\n[dim]Use subcommands (kyc, property, sale, bank, recovery, audit) for detailed management.[/dim]\n")


# ══════════════════════════════════════════════════════════════
#  STATUS COMMAND
# ══════════════════════════════════════════════════════════════

@cli.command()
def status():
    """🩺 Check API server health."""
    try:
        resp = requests.get(f"{API_BASE.rsplit('/api', 1)[0]}/", timeout=5)
        if resp.ok:
            data = resp.json()
            console.print(Panel(
                f"  ✅ Server is [bold green]ONLINE[/bold green]\n"
                f"  📌 Version: {data.get('version', '—')}\n"
                f"  🔗 Network: {data.get('network', '—')}\n"
                f"  ⛓️  Chain ID: {data.get('chainId', '—')}",
                title="[bold green]API Health[/bold green]",
                border_style="green",
                expand=False,
            ))
        else:
            console.print("[bold red]✖ Server responded with an error.[/bold red]")
    except requests.ConnectionError:
        console.print(f"\n[bold red]✖ Cannot connect to {API_BASE}[/bold red]")
        console.print("  Ensure the backend is running.\n")


# ══════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    cli()
