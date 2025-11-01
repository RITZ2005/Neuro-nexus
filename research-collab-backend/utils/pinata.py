# Pinata IPFS Integration
import requests
import os
from typing import Dict, Any

class PinataClient:
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://api.pinata.cloud"
        self.gateway_url = "https://gateway.pinata.cloud"
        
    def pin_file_to_ipfs(self, file_content: bytes, file_name: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Upload file to IPFS via Pinata
        Returns: {
            "IpfsHash": "QmXXXXXXX...",
            "PinSize": 12345,
            "Timestamp": "2024-01-01T00:00:00.000Z"
        }
        """
        url = f"{self.base_url}/pinning/pinFileToIPFS"
        
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret
        }
        
        files = {
            'file': (file_name, file_content)
        }
        
        # Pinata options - simplify to avoid JSON issues
        # We'll store metadata in MongoDB instead
        try:
            response = requests.post(url, files=files, headers=headers, timeout=60)
            
            print(f"Pinata Response Status: {response.status_code}")
            print(f"Pinata Response: {response.text[:200]}")
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Pinata upload failed (status {response.status_code}): {response.text}")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error during Pinata upload: {str(e)}")
    
    def get_file_from_ipfs(self, ipfs_hash: str) -> bytes:
        """
        Retrieve file from IPFS via Pinata gateway
        """
        url = f"{self.gateway_url}/ipfs/{ipfs_hash}"
        response = requests.get(url)
        
        if response.status_code == 200:
            return response.content
        else:
            raise Exception(f"Failed to retrieve file from IPFS: {response.text}")
    
    def unpin_file(self, ipfs_hash: str) -> Dict[str, Any]:
        """
        Remove file from Pinata (optional - for cleanup)
        """
        url = f"{self.base_url}/pinning/unpin/{ipfs_hash}"
        
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret
        }
        
        response = requests.delete(url, headers=headers)
        
        if response.status_code == 200:
            return {"success": True}
        else:
            raise Exception(f"Failed to unpin file: {response.text}")
    
    def test_authentication(self) -> bool:
        """
        Test if API credentials are valid
        """
        url = f"{self.base_url}/data/testAuthentication"
        
        headers = {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.api_secret
        }
        
        response = requests.get(url, headers=headers)
        return response.status_code == 200

# Singleton instance (will be initialized with env variables)
pinata_client = None

def get_pinata_client() -> PinataClient:
    """
    Get or create Pinata client instance
    """
    global pinata_client
    if pinata_client is None:
        api_key = os.getenv("PINATA_API_KEY")
        api_secret = os.getenv("PINATA_API_SECRET")
        
        if not api_key or not api_secret:
            raise Exception("Pinata credentials not found in environment variables")
        
        pinata_client = PinataClient(api_key, api_secret)
    
    return pinata_client
