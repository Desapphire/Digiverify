import requests
import json
import time

class DigiverifyClient:
    """
    Consolidated Python client for the Digiverify Backend API.
    Handles authentication, onboarding, and role-based actions.
    """

    def __init__(self, base_url="http://localhost:5000", verbose=True):
        self.base_url = base_url.rstrip('/')
        self.verbose = verbose
        self.token = None
        self.refresh_token = None
        self.session = requests.Session()

    def _log(self, message):
        if self.verbose:
            print(f"[*] {message}")

    def _request(self, method, endpoint, data=None, params=None, auth=True):
        url = f"{self.base_url}/api{endpoint}"
        headers = {"Content-Type": "application/json"}
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        # Filter out None values from payload to avoid Zod validation errors
        if isinstance(data, dict):
            data = {k: v for k, v in data.items() if v is not None}

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers
            )
            
            try:
                res_json = response.json()
            except:
                res_json = {"text": response.text}

            if not response.ok:
                msg = res_json.get('message', 'Unknown error')
                print(f"[!] Error {response.status_code}: {msg}")
                if 'errors' in res_json:
                    for err in res_json['errors']:
                        print(f"    - {err.get('field', '?')}: {err.get('message', '')}")
            
            return response.status_code, res_json

        except Exception as e:
            print(f"[X] Request failed: {e}")
            return 0, {"error": str(e)}

    # ── Auth & Onboarding ───────────────────────────────────

    def register(self, name, email, password, wallet_address, role='user', phone=None, government_id=None, birthdate=None):
        payload = {
            "name": name,
            "email": email,
            "password": password,
            "walletAddress": wallet_address,
            "role": role,
            "phone": phone,
            "governmentId": government_id,
            "birthdate": birthdate
        }
        self._log(f"Registering user: {email}...")
        return self._request("POST", "/onboarding/register", data=payload)

    def login(self, email, password):
        payload = {"email": email, "password": password}
        self._log(f"Logging in: {email}...")
        code, res = self._request("POST", "/auth/login-password", data=payload, auth=False)
        if code == 200:
            self.token = res['data']['accessToken']
            self.refresh_token = res['data']['refreshToken']
            self._log("Login successful! Token saved.")
        return code, res

    def get_me(self):
        return self._request("GET", "/auth/me")

    # ── User Profile & KYC ──────────────────────────────────

    def get_profile(self):
        return self._request("GET", "/users/profile")

    def bind_face_id(self, face_id_hash):
        payload = {"faceIdHash": face_id_hash}
        self._log(f"Binding Face ID: {face_id_hash}...")
        return self._request("PUT", "/users/face-id", data=payload)

    def submit_kyc(self, kyc_hash):
        payload = {"kycDocumentHash": kyc_hash}
        self._log(f"Submitting KYC: {kyc_hash}...")
        return self._request("POST", "/users/kyc", data=payload)

    def request_recovery(self, old_wallet, reason):
        payload = {"oldWallet": old_wallet, "reason": reason}
        self._log(f"Requesting wallet recovery from {old_wallet}...")
        return self._request("POST", "/users/recovery/request", data=payload)

    # ── Admin & Authority Actions ───────────────────────────

    def admin_approve_kyc(self, user_id):
        self._log(f"Admin: Approving KYC for user {user_id}...")
        return self._request("PUT", f"/admin/kyc/{user_id}/approve")

    def admin_reject_kyc(self, user_id):
        self._log(f"Admin: Rejecting KYC for user {user_id}...")
        return self._request("PUT", f"/admin/kyc/{user_id}/reject")

    def admin_approve_property(self, property_id):
        self._log(f"Admin: Approving property {property_id}...")
        return self._request("PUT", f"/admin/property/{property_id}/approve")

    def admin_set_encumbrance(self, property_id, description):
        payload = {"description": description}
        self._log(f"Admin: Setting encumbrance on property {property_id}...")
        return self._request("PUT", f"/admin/property/{property_id}/encumbrance", data=payload)

    def admin_freeze_property(self, property_id, reason, court_order_hash="IPFS_DUMMY_HASH"):
        payload = {"propertyId": property_id, "reason": reason, "courtOrderHash": court_order_hash}
        self._log(f"Admin: Freezing property {property_id}...")
        return self._request("POST", "/admin/property/freeze", data=payload)

    def admin_force_transfer(self, property_id, new_owner_wallet, court_order_hash, reason="Court Order"):
        payload = {
            "propertyId": property_id, 
            "newOwnerWallet": new_owner_wallet, 
            "courtOrderHash": court_order_hash,
            "reason": reason
        }
        self._log(f"Admin: FORCING TRANSFER of property {property_id} to {new_owner_wallet}...")
        return self._request("POST", "/admin/property/force-transfer", data=payload)

    def admin_approve_sale(self, sale_id):
        self._log(f"Admin: Approving sale {sale_id}...")
        return self._request("POST", f"/admin/sale/{sale_id}/approve")

    def admin_reject_sale(self, sale_id):
        self._log(f"Admin: Rejecting sale {sale_id}...")
        return self._request("POST", f"/admin/sale/{sale_id}/reject")

    def admin_complete_sale(self, sale_id):
        self._log(f"Admin: Completing sale {sale_id}...")
        return self._request("POST", f"/admin/sale/{sale_id}/complete")

    def admin_get_pending_recoveries(self):
        self._log("Admin: Fetching pending wallet recoveries...")
        return self._request("GET", "/admin/recovery/pending")

    def admin_verify_recovery(self, recovery_id):
        self._log(f"Admin: Verifying identity for recovery {recovery_id}...")
        return self._request("PUT", f"/admin/recovery/{recovery_id}/verify")

    def admin_complete_recovery(self, recovery_id, new_wallet):
        payload = {"newWallet": new_wallet}
        self._log(f"Admin: Completing recovery {recovery_id} to new wallet {new_wallet}...")
        return self._request("PUT", f"/admin/recovery/{recovery_id}/complete", data=payload)

    def admin_reject_recovery(self, recovery_id):
        self._log(f"Admin: Rejecting recovery {recovery_id}...")
        return self._request("PUT", f"/admin/recovery/{recovery_id}/reject")

    def admin_get_audit_logs(self):
        self._log("Admin: Fetching audit logs...")
        return self._request("GET", "/admin/audit")

    # ── Property & Sales ────────────────────────────────────

    def register_property(self, survey_number, area_sqft, address_line, state="State", district="District"):
        payload = {
            "surveyNumber": survey_number,
            "areaSqft": area_sqft,
            "addressLine": address_line,
            "state": state,
            "district": district
        }
        self._log(f"Registering property: {survey_number}...")
        return self._request("POST", "/properties", data=payload)

    def get_my_properties(self):
        return self._request("GET", "/properties/my")

    def search_properties(self, query=""):
        self._log(f"Searching properties: '{query}'...")
        return self._request("GET", "/properties/search", params={"q": query})

    def initiate_sale(self, property_id, buyer_wallet, price):
        payload = {
            "propertyId": property_id,
            "buyerWallet": buyer_wallet,
            "salePrice": price
        }
        self._log(f"Initiating sale for property {property_id}...")
        return self._request("POST", "/sales", data=payload)

    def get_my_sales(self):
        return self._request("GET", "/sales/my")

    def get_sale(self, sale_id):
        return self._request("GET", f"/sales/{sale_id}")

    def sign_sale(self, sale_id, signature_hash):
        payload = {"signatureHash": signature_hash}
        self._log(f"Signing sale {sale_id}...")
        return self._request("POST", f"/sales/{sale_id}/sign", data=payload)

    def cancel_sale(self, sale_id):
        self._log(f"Cancelling sale {sale_id}...")
        return self._request("POST", f"/sales/{sale_id}/cancel")

    # ── Bank Actions ────────────────────────────────────────

    def request_fund_block(self, transaction_id, amount):
        payload = {"transactionId": transaction_id, "blockAmount": amount}
        self._log(f"Requesting fund block for transaction {transaction_id}...")
        return self._request("POST", "/bank/fund-block", data=payload)

    def bank_confirm_funds(self, block_id, reference_id="REF-123"):
        payload = {"bankReferenceId": reference_id}
        self._log(f"Bank: Confirming fund block {block_id}...")
        return self._request("PUT", f"/admin/bank/fund-block/{block_id}/confirm", data=payload)

    def bank_release_funds(self, block_id):
        self._log(f"Bank: Releasing funds for block {block_id}...")
        return self._request("PUT", f"/admin/bank/fund-block/{block_id}/release")


# ── CLI / Example Simulation ────────────────────────────────

if __name__ == "__main__":
    client = DigiverifyClient()

    print("\n--- Phase 1: Registration ---")
    ts = int(time.time())
    test_email = f"test_{ts}@example.com"
    test_wallet = "0x" + str(ts).zfill(40)[:40]  # Dynamic wallet base
    
    client.register(
        name="Automation Bot",
        email=test_email,
        password="testPassword123",
        wallet_address=test_wallet,
        birthdate="1990-01-01"
    )

    print("\n--- Phase 2: Authentication ---")
    code, login_res = client.login(test_email, "testPassword123")

    if code == 200:
        print("\n--- Phase 3: Profile & Face ID Binding ---")
        client.get_profile()
        # Providing a 64-character dummy SHA256-like hash to pass validation
        dummy_face_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        f_code, f_res = client.bind_face_id(dummy_face_hash)
        if f_code == 200:
            print("[✓] Face ID bound successfully!")
        client.search_properties()
        
        print("\n--- Phase 4: KYC Submission ---")
        client.submit_kyc("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco")
        
        print("\n--- API Client Ready! ---")
        print("You can now use this script to automate your tests.")
    else:
        print("[!] Flow stopped due to login failure.")
