"use client";
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import { v4 as uuidv4 } from "uuid";

export const generateUUID = () => {
  return uuidv4();
};

// export const getAppId = async (setAppIdnew) => {
//   try {
//     const response = await fetch("/api/appId");
//     const result = await response.json();
//     if (result && result.data && result.data.appId) {
//       setAppIdnew(result.data.appId);
//       console.log("AppId: " + result.data.appId);
//     } else {
//       console.error("appId not found in data");
//     }
//   } catch (error) {
//     console.error("Error fetching appId:", error);
//   }
// };

export const createNewUser = async () => {
  const userId = uuidv4();

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
    const result = await res.json();
    window?.localStorage.setItem("userId", userId);
    console.log("User created: ", result);
  } catch (error) {
    console.error(error);
  }
};

export const createSessionToken = async () => {
  const userId = window?.localStorage.getItem("userId");

  if (!userId) {
    console.error("User ID not found in storage");
    return;
  }
  try {
    const res = await fetch("/api/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
    const result = await res.json();
    window?.localStorage.setItem("userToken", result.data.userToken);
    window?.localStorage.setItem("encryptionKey", result.data.encryptionKey);
  } catch (error) {
    console.error(error);
  }
};

export const initializeAccount = async () => {
  const idempotencyKey = generateUUID();
  const userToken = window?.localStorage.getItem("userToken");
  try {
    const res = await fetch("/api/users/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userToken,
        idempotencyKey,
      }),
    });
    const result = await res.json();
    window?.localStorage.setItem(
      "initializeAccountChallengeId",
      result.data.challengeId
    );
  } catch (error) {
    console.error(error);
  }
};

export const executeChallenge = async (e, sdk, appId, toast) => {
  e.preventDefault();
  const userToken = window?.localStorage.getItem("userToken");
  const encryptionKey = window?.localStorage.getItem("encryptionKey");
  const challengeId = window?.localStorage.getItem("initializeAccountChallengeId");
  try {
    if (!sdk) {
      sdk = new W3SSdk();
    }

    sdk.setAppSettings({ appId });
    sdk.setAuthentication({ userToken, encryptionKey });

    sdk.execute(challengeId, (error, result) => {
      if (error) {
        toast.error(`Error: ${error?.message ?? "Error!"}`);
        return;
      }
      toast.success(`Challenge: ${result?.type}, Status: ${result?.status}`);
      console.log("Challenge executed: ", result);
    });
  } catch (error) {
    console.error("Error executing challenge:", error.message);
    toast.error("An error occurred while executing the challenge.");
  }
};

export const fetchWalletData = async () => {
  const userToken = window?.localStorage.getItem("userToken");

  try {
    const response = await fetch("/api/checkWalletStatus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userToken }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "An error occurred");
    }
    const wallet = data.data.wallets[0];
    console.log("Wallet data fetched: ", data);
    window?.localStorage.setItem("walletId", wallet.id);
    window?.localStorage.setItem("walletAddress", wallet.address);
    window?.localStorage.setItem("blockchain", wallet.blockchain);
  } catch (error) {
    console.error(error);
  }
};

export const fundWallet = async (e, setError, setFundResponse) => {
  e.preventDefault();
  setError("");
  setFundResponse(null);
  const address = localStorage.getItem("walletAddress");

  try {
    const response = await fetch("/api/fundWallet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "An error occurred");
    }
    setFundResponse(data);
  } catch (error) {
    console.error(error);
    setError(error.message);
  }
};

export const getWalletBalances = async (e, setError) => {
  e.preventDefault();
  setError("");

  const walletId = window?.localStorage.getItem("walletId");

  try {
    const response = await fetch("/api/getWalletBalance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "An error occurred");
    }
    data.data.tokenBalances.forEach((balance, index) => {
      window?.localStorage.setItem(`token_${index}_amount`, balance.amount);
      window?.localStorage.setItem(`token_${index}_id`, balance.token.id);
      window?.localStorage.setItem(
        `token_${index}_blockchain`,
        balance.token.blockchain
      );
      window?.localStorage.setItem(`token_${index}_name`, balance.token.name);
      window?.localStorage.setItem(`token_${index}_symbol`, balance.token.symbol);
      window?.localStorage.setItem(`token_${index}_decimals`, balance.token.decimals);
      window?.localStorage.setItem(`token_${index}_updateDate`, balance.updateDate);
    });
  } catch (error) {
    console.error(error);
    setError(error.message);
  }
};

export const initiateTransfer = async (
  e,
  destinationAddress,
  refId,
  amounts,
  setError
) => {
  e.preventDefault();
  setError("");
  const userId = window?.localStorage.getItem("userId");
  const idempotencyKey = generateUUID();
  const walletId = window?.localStorage.getItem("walletId");
  const userToken = window?.localStorage.getItem("userToken");
  const tokenId = window?.localStorage.getItem(`token_${1}_id`);

  try {
    const response = await fetch("/api/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotencyKey,
        userId,
        destinationAddress,
        refId,
        amounts,
        tokenId,
        walletId,
        userToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "An error occurred");
    }
    window?.localStorage.setItem("transferChallengeId", data.data.challengeId);
  } catch (error) {
    console.error(error);
    setError(error.message);
  }
};

// contract execution onaylamak için kullanılan fonksiyon
// export const confirmExecution = async (
//   e,
//   sdk,
//   appId,
//   userToken,
//   encryptionKey,
//   setExecutionResponse,
//   challengeId,
//   toast
// ) => {
//   e.preventDefault();
//   try {
//     if (!sdk) {
//       sdk = new W3SSdk();
//     }

//     sdk.setAppSettings({ appId });

//     sdk.setAuthentication({
//       userToken,
//       encryptionKey,
//     });

//     sdk.execute(challengeId, (error, result) => {
//       if (error) {
//         toast.error(`Error: ${error?.message ?? "Error!"}`);
//         return;
//       }
//       toast.success(
//         `Execution confirmed: ${result?.type}, Status: ${result?.status}`
//       );
//       console.log("Execution confirmed: ", result);
//       setExecutionResponse(result);
//     });
//   } catch (error) {
//     console.error("Error confirming execution:", error.message);
//     toast.error("An error occurred while confirming the execution.");
//   }
// };
