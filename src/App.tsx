import "./App.css";
import { useState, useEffect } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import * as sigUtil from "@metamask/eth-sig-util";

const App = () => {
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const initialState = { accounts: [] };
  const [wallet, setWallet] = useState(initialState);
  const [encryptionPublicKey, setEncryptionPublicKey] = useState<string | null>(
    null
  );
  const [rawData, setRawData] = useState<string | null>(null);
  const [encryptedData, setEncryptedData] = useState<string>("");
  const [decryptedData, setDecryptedData] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>('');


  useEffect(() => {
    const refreshAccounts = (accounts: any) => {
      if (accounts.length > 0) {
        updateWallet(accounts);
      } else {
        // if length 0, user is disconnected
        setWallet(initialState);
      }
    };

    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true });
      setHasProvider(Boolean(provider));

      if (provider) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        refreshAccounts(accounts);
        window.ethereum.on("accountsChanged", refreshAccounts);
      }
    };

    getProvider();

    return () => {
      window.ethereum?.removeListener("accountsChanged", refreshAccounts);
    };
  }, []);

  const updateWallet = async (accounts: any) => {
    setWallet({ accounts });
  };

  const handleConnect = async () => {
    let accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    updateWallet(accounts);
  };

  // get encryption public key
  const HandleGetEncryptionPublicKey = async (): Promise<void> => {
    if (hasProvider && wallet.accounts) {
      const accounts = wallet.accounts;
      const _encryptionPublicKey = await window.ethereum.request({
        method: "eth_getEncryptionPublicKey",
        params: [accounts[0]],
      });

      setEncryptionPublicKey(_encryptionPublicKey);
    }
  };

  // Encrypt the rawData
  const EncryptRawData = async (): Promise<void> => {
    if (!encryptionPublicKey || !rawData) {
      setErrorMessage("encryptionPublicKey or rawData missing");
      return;
    }
    setErrorMessage('')
    const result = await sigUtil.encrypt({
      publicKey: encryptionPublicKey,
      data: rawData,
      version: "x25519-xsalsa20-poly1305",
    });
    console.log(result.ciphertext);
    setEncryptedData(JSON.stringify(result));
  };
  const decryptData = async (): Promise<void> => {
    if (!encryptedData) {
      setErrorMessage("encryptedData missing");
      return;
    }
    setErrorMessage('')
    const result = await window.ethereum.request({
      method: "eth_decrypt",
      params: [encryptedData, wallet.accounts[0]],
    });
    console.log(result);
    setDecryptedData(result)
  };

  return (
    <div className="App">
      {/* Show error message when there's one */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      <header className="App-header">
        <h2>Metamask Encryption App</h2>
      </header>

      {window.ethereum?.isMetaMask &&
        wallet.accounts.length < 1 /* Updated */ && (
          <button className="btn-connect" onClick={handleConnect}>
            Connect MetaMask
          </button>
        )}

      {wallet.accounts.length > 0 && (
        <div className="account-details">
          <h3>Account Details</h3>
          <p>Wallet Accounts: {wallet.accounts[0]}</p>
          <p>Encryption Public Key: <input
              className="input-data"
              type="text"
              value={encryptionPublicKey?encryptionPublicKey:""}
              onInput={(e) => setEncryptionPublicKey(e.currentTarget.value)}
          /></p>
          <button className="btn-action" onClick={HandleGetEncryptionPublicKey}>
            Get encryption public key
          </button>
          <input
            className="input-data"
            type="text"
            placeholder="Enter data to encrypt"
            onInput={(e) => setRawData(e.currentTarget.value)}
          />
          <button className="btn-action" onClick={EncryptRawData}>
            Encrypt
          </button>
          <div>
            <pre>
              {JSON.stringify(JSON.parse(encryptedData || "{}"), null, 2)}
            </pre>
            <textarea
                rows={4}
                cols={50}
                value={encryptedData}
                onChange={(e) => setEncryptedData(e.target.value)}>

            </textarea>
          </div>
          <button className="btn-action" onClick={decryptData}>
            Decrypt Encrypted Data
          </button>
          <div>
            <pre>
              {decryptedData}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
