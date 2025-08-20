export const STRIPE_PLANS = {
  INICIAL: {
    id: "inicial",
    name: "Plan Inicial",
    prices: {
      monthly: {
        priceId: "price_1RurRVDXuo6lFrulIR8O4OrT",
        amount: 10000, // 💰 100 €
        currency: "EUR",
      },
      yearly: {
        priceId: "price_1RurSMDXuo6lFrul0gfsVgjv",
        amount: 96000, // 💰 960 €
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
  TEST: {
    id: "test",
    name: "Plan Test (0,01€)",
    prices: {
      monthly: {
        priceId: "price_1RxVVVDXuo6lFrulecOoZdib",
        amount: 1, // 💰 0,01 €
        currency: "EUR",
      },
      yearly: {
        priceId: "price_1RxVVVDXuo6lFrulecOoZdib",
        amount: 1,
        currency: "EUR",
      },
    },
  },
  NUEVO: {
    id: "nuevo",
    name: "Plan Nuevo (0,50€)",
    prices: {
      monthly: {
        priceId: "price_1Ry8nWDXuo6lFrulyk1wMszn", // 👈 tu nuevo priceId
        amount: 50, // 💰 0,50 € en céntimos
        currency: "EUR",
      },
      yearly: {
        priceId: "price_1Ry8nWDXuo6lFrulyk1wMszn", // si solo tienes un price, lo puedes reutilizar
        amount: 600, // 💰 6 € en céntimos (ejemplo, 0,50 * 12)
        currency: "EUR",
      },
    },
  },
} as const
