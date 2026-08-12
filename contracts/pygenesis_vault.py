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
        
        # 1. Fetch the vulnerability report
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
        response = response.strip()
        
        try:
            evaluation = json.loads(response)
        except Exception as e:
            raise Exception(f"Failed to parse AI evaluation: {response}")
            
        # 3. Payout Logic (Stake & Slashing)
        is_valid = evaluation.get("valid", False)
        
        if is_valid:
            # Reward: Return 1 GEN stake + 4 GEN reward = 5 GEN
            payout_wei = u256(int(5 * 10**18))
            _Recipient(Address(str(gl.message.sender_address))).emit_transfer(value=payout_wei, on='finalized')
            status = "Rewarded (4 GEN + 1 GEN Stake Returned)"
        else:
            # Slash: Send 1 GEN stake to null address
            burn_wei = u256(int(1 * 10**18))
            _Recipient(Address("0x0000000000000000000000000000000000000000")).emit_transfer(value=burn_wei, on='finalized')
            status = "Slashed (1 GEN Stake Burned)"
            
        # Save submission record
        record = {
            "id": int(submission_id),
            "url": report_url,
            "status": status,
            "reasoning": evaluation.get("reasoning", ""),
            "submitter": str(gl.message.sender_address)
        }
        self.submissions[submission_id] = json.dumps(record)
        return json.dumps(record)

    @gl.public.view
    def get_submission(self, submission_id: u256) -> str:
        if submission_id not in self.submissions:
            raise Exception("Submission not found")
        return self.submissions[submission_id]
