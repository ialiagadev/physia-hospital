export const STRIPE_PLANS = {
    BASIC: {
      id: "basic",
      name: "Plan Básico",
      description: "Perfecto para clínicas pequeñas",
      price: "1€/mes",
      features: [
        "Hasta 100 pacientes",
        "Gestión de citas básica",
        "Soporte por email",
      ],
      stripePriceId: "price_1RxOKwDXuo6lFruINzMRxuTR", // 👈 este es el bueno
    },
  } as const;
  
  export const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  