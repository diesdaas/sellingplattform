import gs_logo from "./gs_logo.jpg"
import happy_store from "./happy_store.webp"
import upload_area from "./upload_area.svg"
import hero_model_img from "./hero_model_img.png"
import hero_product_img1 from "./hero_product_img1.png"
import hero_product_img2 from "./hero_product_img2.png"
import product_img1 from "./product_img1.png"
import product_img2 from "./product_img2.png"
import product_img3 from "./product_img3.png"
import product_img4 from "./product_img4.png"
import product_img5 from "./product_img5.png"
import product_img6 from "./product_img6.png"
import product_img7 from "./product_img7.png"
import product_img8 from "./product_img8.png"
import product_img9 from "./product_img9.png"
import product_img10 from "./product_img10.png"
import product_img11 from "./product_img11.png"
import product_img12 from "./product_img12.png"
import { ClockFadingIcon, HeadsetIcon, SendIcon, TruckIcon, RefreshCcwIcon } from "lucide-react";
import profile_pic1 from "./profile_pic1.jpg"
import profile_pic2 from "./profile_pic2.jpg"
import profile_pic3 from "./profile_pic3.jpg"

export const assets = {
    upload_area, hero_model_img,
    hero_product_img1, hero_product_img2, gs_logo,
    product_img1, product_img2, product_img3, product_img4, product_img5, product_img6,
    product_img7, product_img8, product_img9, product_img10, product_img11, product_img12,
}

export const categories = ["Headphones", "Speakers", "Watch", "Earbuds", "Mouse", "Decoration"];

export const dummyRatingsData = []

export const dummyStoreData = null

export const productDummyData = []

export const addressDummyData = {}

export const ourSpecsData = [
    {
        title: "Free Shipping",
        description: "Enjoy fast, free delivery on every order no conditions, just reliable doorstep.",
        icon: TruckIcon,
        accent: "#00C950"
    },
    {
        title: "7 Days easy Return",
        description: "Change your mind? No worries. Return any item within 7 days.",
        icon: RefreshCcwIcon,
        accent: "#FFB800"
    },
    {
        title: "24/7 Customer Support",
        description: "We're here for you. Get expert help with our customer support.",
        icon: HeadsetIcon,
        accent: "#4F46E5"
    }
];

export const dummyAdminDashboardData = {
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    recentOrders: []
};

export const storesDummyData = [];

export const couponDummyData = [];

export const orderDummyData = [];

export const dummyStoreDashboardData = {
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    recentOrders: []
};
