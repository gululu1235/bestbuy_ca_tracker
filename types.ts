export interface Location {
    name: string;
    locationKey: string;
    quantityOnHand: number;
    hasInventory: boolean;
    isReservable: boolean;
    // Other fields we might not use immediately but exist in response
    fulfillmentKey?: string;
    supportsFulfillment?: boolean;
}

export interface Pickup {
    status: 'InStock' | 'OutOfStock' | 'ComingSoon' | string;
    purchasable: boolean;
    locations: Location[];
}

export interface Shipping {
    status: 'InStock' | 'SoldOutOnline' | 'BackOrder' | string;
    quantityRemaining: number;
    purchasable: boolean;
    isBackorderable: boolean;
}

export interface Availability {
    sku: string;
    sellerId: string;
    pickup: Pickup;
    shipping: Shipping;
    saleChannelExclusivity?: string;
}

export interface BestBuyResponse {
    availabilities: Availability[];
}