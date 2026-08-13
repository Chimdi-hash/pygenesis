# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

class PyGenesisVault(gl.Contract):
    protocol_code_context: str
    submissions: TreeMap[u256, str]
    submission_counter: u256
    owner: Address

    def __init__(self):
        self.protocol_code_context = """
        PyGenesis Vault is protecting a decentralized exchange (DEX).
        The DEX relies on automated market maker (AMM) formulas.
        Critical vulnerabilities include reentrancy, unauthorized withdrawals, and math errors.
        """
        self.submissions = TreeMap()
        self.submission_counter = u256(0)
        self.owner = gl.message.sender_address

    @gl.public.write.payable
    def deposit_bounty_pool(self) -> str:
        # Accept GEN deposits to fund the bug bounty pool
        return f"Deposited {gl.message.value} wei into the bounty pool."

    @gl.public.write.payable
    def submit_vulnerability(self, report_url: str) -> str:
        required_stake = int(1 * 10**18)
        if gl.message.value < required_stake:
            raise Exception("A 1 GEN stake is required to submit a vulnerability report. This will be slashed if the report is invalid.")

        submission_id = self.submission_counter
        self.submission_counter += 1
        
        # Save submission record in pending state
        record = {
            "id": int(submission_id),
            "url": report_url,
            "status": "Pending AI Adjudication",
            "severity": "None",
            "patch": "",
            "reasoning": "Awaiting Keeper to trigger adjudication...",
            "submitter": str(gl.message.sender_address)
        }
        self.submissions[submission_id] = json.dumps(record)
        return json.dumps(record)
        
    @gl.public.write
    def adjudicate_vulnerability(self, submission_id: u256) -> str:
        if submission_id not in self.submissions:
            raise Exception("Submission not found")
            
        record = json.loads(self.submissions[submission_id])
        if record["status"] != "Pending AI Adjudication":
            raise Exception("Submission already adjudicated.")
            
        report_url = record["url"]
        submitter_addr = record["submitter"]
        
        # 1. LLM Consensus Pre-check on the URL (Inline with GenLayer Protocol)
        def get_url_context() -> str:
            return f"Submitted Report URL: {report_url}"
            
        url_check_response = gl.eq_principle.prompt_non_comparative(
            get_url_context,
            task="Evaluate if this URL is a standard, safe platform for hosting code or security reports (e.g., GitHub, Gist, Pastebin, Medium, official blogs). If it looks like a malicious raw IP address, an internal network address, or a highly suspicious domain, flag it. Return a JSON with 'is_safe' (boolean) and 'reasoning' (string).",
            criteria="Return strictly valid JSON with keys 'is_safe' and 'reasoning'."
        ).strip()
        
        if url_check_response.startswith("```json"):
            url_check_response = url_check_response[7:]
        elif url_check_response.startswith("```"):
            url_check_response = url_check_response[3:]
        if url_check_response.endswith("```"):
            url_check_response = url_check_response[:-3]
            
        try:
            url_check_data = json.loads(url_check_response.strip())
        except Exception:
            url_check_data = {"is_safe": False, "reasoning": "Failed to parse URL safety check."}
            
        if not url_check_data.get("is_safe", False):
            # Slash immediately for submitting a malicious/invalid URL
            burn_wei = u256(int(1 * 10**18))
            _Recipient(Address("0x0000000000000000000000000000000000000000")).emit_transfer(value=burn_wei, on='finalized')
            
            record["status"] = "Slashed (1 GEN Stake Burned - Unsafe URL)"
            record["reasoning"] = url_check_data.get("reasoning", "Suspicious URL rejected by LLM Consensus.")
            self.submissions[submission_id] = json.dumps(record)
            return json.dumps(record)
        
        # 2. Fetch the vulnerability report since URL is safe
        def fetch_report() -> str:
            response = gl.nondet.web.get(report_url)
            return response.body.decode("utf-8")
            
        try:
            report_content = gl.eq_principle.strict_eq(fetch_report)
        except Exception as e:
            # If the fetch fails, we refund the stake automatically by not processing further
            raise Exception(f"Error fetching report: {str(e)}")
            
        # 2. Evaluate using LLM Consensus
        def get_evaluation_context() -> str:
            return f"Protocol Context:\n{self.protocol_code_context}\n\nVulnerability Report from URL:\n{report_content}"
            
        response = gl.eq_principle.prompt_non_comparative(
            get_evaluation_context,
            task="Analyze the vulnerability report. Determine if it represents a valid exploit against the protocol. Return a JSON object with 'valid' (boolean) and 'reasoning' (short explanation justifying if it should be rewarded or slashed for spam).",
            criteria="Return strictly valid JSON with keys 'valid' and 'reasoning'."
        ).strip()
        
        # Clean markdown
        if response.startswith("```json"):
            response = response[7:]
        elif response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
            
        try:
            evaluation = json.loads(response.strip())
        except Exception:
            evaluation = {"valid": False, "reasoning": "Failed to parse AI evaluation."}
            
        is_valid = evaluation.get("valid", False)
        severity = "None"
        patch = ""
        
        if is_valid:
            # 3. Stage 3: Triage Lead & Developer (Severity and Patch Generation)
            triage_response = gl.eq_principle.prompt_non_comparative(
                get_evaluation_context,
                task="This vulnerability has been marked as valid. 1) Assign a severity score (Critical, High, Medium, Low). 2) Generate a specific code patch to fix the vulnerable protocol. Return a JSON object with 'severity' (string) and 'patch' (string containing the code diff).",
                criteria="Return strictly valid JSON with keys 'severity' and 'patch'."
            ).strip()
            
            # Clean markdown
            if triage_response.startswith("```json"):
                triage_response = triage_response[7:]
            elif triage_response.startswith("```"):
                triage_response = triage_response[3:]
            if triage_response.endswith("```"):
                triage_response = triage_response[:-3]
                
            try:
                triage_data = json.loads(triage_response.strip())
                severity = triage_data.get("severity", "Medium").capitalize()
                patch = triage_data.get("patch", "No patch provided.")
            except Exception:
                severity = "Medium"
                patch = "AI failed to generate patch."
                
            # Dynamic Payout Logic
            if severity == "Critical":
                reward = 20
            elif severity == "High":
                reward = 10
            elif severity == "Medium":
                reward = 4
            else:
                reward = 1 # Low
                
            payout_wei = u256(int((reward + 1) * 10**18)) # +1 for stake return
            _Recipient(Address(submitter_addr)).emit_transfer(value=payout_wei, on='finalized')
            status = f"Rewarded ({reward} GEN + 1 GEN Stake Returned)"
            
        else:
            # Slash: Send 1 GEN stake to null address
            burn_wei = u256(int(1 * 10**18))
            _Recipient(Address("0x0000000000000000000000000000000000000000")).emit_transfer(value=burn_wei, on='finalized')
            status = "Slashed (1 GEN Stake Burned)"
            
        # Update submission record
        record["status"] = status
        record["severity"] = severity
        record["patch"] = patch
        record["reasoning"] = evaluation.get("reasoning", "")
        
        self.submissions[submission_id] = json.dumps(record)
        return json.dumps(record)

    @gl.public.view
    def get_submission(self, submission_id: u256) -> str:
        if submission_id not in self.submissions:
            raise Exception("Submission not found")
        return self.submissions[submission_id]
