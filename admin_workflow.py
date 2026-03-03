import time
from digiverify_cli import DigiverifyClient

def run_admin_workflow():
    client = DigiverifyClient()
    ts = int(time.time())
    
    admin_email = f"superadmin_{ts}@gov.in"
    admin_wallet = "0x" + str(ts).zfill(40)[:40]
    
    print("\n=== STEP 1: Administrative Setup ===")
    # Registering as super_admin to have full access
    client.register(
        name="Global Admin",
        email=admin_email,
        password="adminSecret123",
        wallet_address=admin_wallet,
        role="super_admin",
        government_id=f"GOV-ADMIN-{ts}"
    )
    
    code, login_res = client.login(admin_email, "adminSecret123")
    if code != 200:
        print("[X] Admin login failed. Exiting.")
        return

    print("\n=== STEP 2: System Health Check & Audit ===")
    # Check audit logs (initially should have at least the registration entry)
    a_code, a_res = client.admin_get_audit_logs()
    if a_code == 200:
        logs = a_res.get('data', [])
        print(f"[✓] Successfully retrieved {len(logs)} audit logs.")
    
    print("\n=== STEP 3: User Verification Simulation ===")
    # 3.1. Register a regular user to approve
    user_ts = ts + 1
    user_email = f"citizen_{user_ts}@example.com"
    user_wallet = "0x" + str(user_ts).zfill(40)[:40]
    
    client.register(
        name="John Citizen",
        email=user_email,
        password="userPassword123",
        wallet_address=user_wallet,
        role="user"
    )
    
    # We need the user's ID. Let's find them or assuming they were just created.
    # In a real scenario, we'd search or get from the registration response.
    # For simulation, let's use the login to get the profile.
    user_client = DigiverifyClient(verbose=False)
    user_client.login(user_email, "userPassword123")
    _, p_res = user_client.get_profile()
    user_id = p_res['data']['id']
    
    # Approve KYC
    client.admin_approve_kyc(user_id)
    
    print("\n=== STEP 4: Property Management Simulation ===")
    # Register a property (as the user) then approve (as admin)
    user_client.register_property(
        survey_number=f"SURVEY-{user_ts}",
        area_sqft=1250.0,
        address_line="123 Green Valley",
        state="Karnataka",
        district="Bangalore"
    )
    
    # Search for the property to get ID
    _, s_res = client.search_properties(f"SURVEY-{user_ts}")
    properties = s_res.get('data', [])
    if properties:
        prop_id = properties[0]['id']
        
        # 4.1 Approve Property
        client.admin_approve_property(prop_id)
        
        # 4.2 Set Encumbrance (e.g. Bank Loan)
        client.admin_set_encumbrance(prop_id, "Active loan of $50,000 with HDFC Bank.")
        
        # 4.3 Freeze Property (e.g. Legal Dispute)
        client.admin_freeze_property(prop_id, "Ongoing family inheritance dispute.")
    else:
        print("[!] No property found to simulate admin actions.")

    print("\n=== STEP 5: Final Audit Log Check ===")
    client.admin_get_audit_logs()

    print("\n[✓] Admin part script finished successfully.")

if __name__ == "__main__":
    run_admin_workflow()
