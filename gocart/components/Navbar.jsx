'use client'
import { Search, ShoppingCart, User, LogOut, Store, Palette, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "@/lib/features/auth/authSlice";

const Navbar = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    const [search, setSearch] = useState('')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const cartCount = useSelector(state => state.cart.total)
    const { user, isAuthenticated } = useSelector(state => state.auth)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
    }

    const handleLogout = () => {
        dispatch(logout());
        router.push('/');
    }

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">go</span>cart<span className="text-green-600 text-5xl leading-0">.</span>
                        <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                            plus
                        </p>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/">Home</Link>
                        <Link href="/shop">Shop</Link>
                        
                        {/* Sell / Artist Link */}
                        {isAuthenticated && (user?.role === 'artist' || user?.role === 'admin') ? (
                            <Link href="/store" className="flex items-center gap-1 text-green-600 font-medium hover:text-green-700">
                                <Store size={16} />
                                My Store
                            </Link>
                        ) : (
                            <Link href="/create-store" className="flex items-center gap-1 hover:text-green-600">
                                <Palette size={16} />
                                Sell Art
                            </Link>
                        )}

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>

                        <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                            <ShoppingCart size={18} />
                            Cart
                            <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">{cartCount}</button>
                        </Link>

                        {isAuthenticated ? (
                            <div className="relative group">
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                                    <User size={18} className="text-indigo-500" />
                                    <span className="text-sm font-medium">{user?.name}</span>
                                    <ChevronDown size={14} className="text-slate-400" />
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <Link href="/orders" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-sm">
                                        <ShoppingCart size={16} />
                                        My Orders
                                    </Link>
                                    {(user?.role === 'artist' || user?.role === 'admin') && (
                                        <>
                                            <Link href="/store" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-sm">
                                                <Store size={16} />
                                                Store Dashboard
                                            </Link>
                                            <Link href="/store/add-product" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-sm">
                                                <Palette size={16} />
                                                Add Product
                                            </Link>
                                        </>
                                    )}
                                    {user?.role === 'admin' && (
                                        <Link href="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-sm text-purple-600">
                                            <User size={16} />
                                            Admin Panel
                                        </Link>
                                    )}
                                    <hr className="my-2 border-slate-100" />
                                    <button 
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-red-500 w-full text-left"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => router.push('/login')}
                                className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full"
                            >
                                Login
                            </button>
                        )}

                    </div>

                    {/* Mobile Menu */}
                    <div className="sm:hidden flex items-center gap-3">
                        {isAuthenticated && (user?.role === 'artist' || user?.role === 'admin') && (
                            <button 
                                onClick={() => router.push('/store')} 
                                className="size-10 bg-green-100 rounded-full flex items-center justify-center"
                            >
                                <Store size={20} className="text-green-600" />
                            </button>
                        )}
                        {isAuthenticated ? (
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="size-10 bg-slate-100 rounded-full flex items-center justify-center">
                                <User size={20} className="text-indigo-500" />
                            </button>
                        ) : (
                            <button 
                                onClick={() => router.push('/login')}
                                className="px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <hr className="border-gray-300" />
            
            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && isAuthenticated && (
                <div className="sm:hidden absolute right-4 top-16 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                        <p className="font-medium text-slate-700">{user?.name}</p>
                        <p className="text-xs text-slate-400">{user?.email}</p>
                    </div>
                    <Link href="/shop" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm">
                        <ShoppingCart size={16} />
                        Shop
                    </Link>
                    <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm">
                        <ShoppingCart size={16} />
                        My Orders
                    </Link>
                    {(user?.role === 'artist' || user?.role === 'admin') ? (
                        <>
                            <Link href="/store" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm text-green-600">
                                <Store size={16} />
                                Store Dashboard
                            </Link>
                            <Link href="/store/add-product" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm">
                                <Palette size={16} />
                                Add Product
                            </Link>
                        </>
                    ) : (
                        <Link href="/create-store" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm text-green-600">
                            <Palette size={16} />
                            Become a Seller
                        </Link>
                    )}
                    {user?.role === 'admin' && (
                        <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 text-sm text-purple-600">
                            <User size={16} />
                            Admin Panel
                        </Link>
                    )}
                    <hr className="my-2 border-slate-100" />
                    <button 
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-sm text-red-500 w-full text-left"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            )}
        </nav>
    )
}

export default Navbar
