
export type Asset = {
  name: string;
  quantity: number;
};

export type EarmarkedItem = {
  reservationId: string;
  asset: Asset;
};

export type BookedItem = {
  orderId: string;
  asset: Asset;
};
