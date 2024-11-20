
export type Asset = {
  name: string;
  quantity: number;
};

export type EarmarkedOrder = {
  reservationId: string;
  asset: Asset;
};

export type BookedOrder = {
  orderId: string;
  asset: Asset;
};
