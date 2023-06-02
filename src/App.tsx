import "./App.css";
import { useState, useEffect } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import * as sigUtil from "@metamask/eth-sig-util";
import { Tooltip as ReactTooltip } from 'react-tooltip'

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

      {window.ethereum ? (
          window.ethereum.isMetaMask && wallet.accounts.length < 1 ? (
              <button className="btn-connect" onClick={handleConnect}>
                Connect MetaMask
              </button>
          ) : (
              <div></div>
          )
      ) : (
          <div className="alert-box">
            Please <a href="https://metamask.io/download.html" target="_blank" rel="noreferrer">install MetaMask</a>
          </div>
      )}


      {wallet.accounts.length > 0 && (
        <div className="account-details">
          <h3>Account Details</h3>
          <p>Wallet Accounts: {wallet.accounts[0]}</p>
          <ReactTooltip id="encryption-public-key-tip" place="top">
            <div>
              <p>The public encryption key is used by others to encrypt messages for you.</p>
              <p>You paste your friends public encryption key here to encrypt messages for them.</p>
              <p>Click the 'Get Public Encryption Key' button to get your public encryption key.</p>
              <p>Pass your `public encryption key` around so your friends can encrypt messages</p>
              <p>Which only you can decrypt.</p>
            </div>
          </ReactTooltip>
          <p>
            Encryption Public Key:
            <a data-tooltip-id="encryption-public-key-tip">❓
            </a>
            <input
                className="input-data"
                type="text"
                value={encryptionPublicKey || ""}
                onInput={(e) => setEncryptionPublicKey(e.currentTarget.value)}
            />
          </p>
          <button className="btn-action" onClick={HandleGetEncryptionPublicKey}>
            Get Public Encryption Key
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
          <ReactTooltip id="encryptionDataTip" place="top">
            <div>
              <p>Paste the encrypted data below to decrypt using the selected wallet.</p>
              <p>Unless you encrypted data, then copy the contents below and share with your friend</p>
            </div>
          </ReactTooltip>
          <p>
            Encrypted Data:
            <a data-tooltip-id="encryptionDataTip">❓</a>
          </p>
          <div>
            <textarea
                rows={4}
                cols={50}
                value={encryptedData}
                onChange={(e) => setEncryptedData(e.target.value)}>
            </textarea>
            <pre>
              {JSON.stringify(JSON.parse(encryptedData || "{}"), null, 2)}
            </pre>

            <button className="btn-action" onClick={decryptData}>
              Decrypt Encrypted Data
            </button>
          </div>
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
