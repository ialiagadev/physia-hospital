export const STRIPE_PLANS = {
    INICIAL: {
      id: "inicial",
      name: "Plan Inicial",
     
      prices: {
        monthly: {
          priceId: "price_1RurRVDXuo6lFrulIR8O4OrT",
          amount: 10000, // 💰 100 € en céntimos
          currency: "EUR",
        },
        yearly: {
          priceId: "price_1RurSMDXuo6lFrul0gfsVgjv",
          amount: 96000, // 💰 960 € en céntimos
          currency: "EUR",
        },
      },
    },
    AVANZADO: {
      id: "avanzado",
      name: "Plan Avanzado",
      
      prices: {
        monthly: {
          priceId: "price_1RurSLDXuo6lFrulQDohkIKD",
          amount: 15000, // 💰 150 €
          currency: "EUR",
        },
        yearly: {
          priceId: "price_1RurSLDXuo6lFrulJ5HgOEKW",
          amount: 144000, // 💰 1440 €
          currency: "EUR",
        },
      },
    },
    PREMIUM: {
      id: "premium",
      name: "Plan Premium",
    
      prices: {
        monthly: {
          priceId: "price_1RurSLDXuo6lFrulPG0Ui7aF",
          amount: 20000, // 💰 200 €
          currency: "EUR",
        },
        yearly: {
          priceId: "price_1RurSLDXuo6lFruly6THZJs0",
          amount: 192000, // 💰 1920 €
          currency: "EUR",
        },
      },
    },
  } as const
  