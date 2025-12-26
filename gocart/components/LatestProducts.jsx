'use client'
import React, { useEffect } from 'react'
import Title from './Title'
import ProductCard from './ProductCard'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProducts } from '@/lib/features/product/productSlice'

const LatestProducts = () => {
    const dispatch = useDispatch()
    const displayQuantity = 4
    const { list: products, loading } = useSelector(state => state.product)

    useEffect(() => {
        dispatch(fetchProducts())
    }, [dispatch])

    if (loading && products.length === 0) {
        return (
            <div className='px-6 my-30 max-w-6xl mx-auto flex items-center justify-center min-h-[200px]'>
                <p className="text-slate-500 animate-pulse">Loading amazing artworks...</p>
            </div>
        )
    }

    return (
        <div className='px-6 my-30 max-w-6xl mx-auto'>
            <Title title='Latest Products' description={`Showing ${products.length < displayQuantity ? products.length : displayQuantity} of ${products.length} products`} href='/shop' />
            <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
                {products && products.length > 0 ? (
                    products.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, displayQuantity).map((product, index) => (
                        <ProductCard key={index} product={product} />
                    ))
                ) : (
                    <div className="w-full text-center py-10 text-slate-400">
                        No products found. Start by adding some artwork!
                    </div>
                )}
            </div>
        </div>
    )
}

export default LatestProducts
