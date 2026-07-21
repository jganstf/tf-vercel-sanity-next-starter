import { Suspense } from 'react'
import {AllPosts} from '@/components/Posts'

export default function StarterRecentPosts({ settings }: { settings: any }) {
    return (
        <div className="border-t border-gray-100 bg-gray-50">
            <div className="container">
                <aside className="py-12 sm:py-20">
                    <Suspense>
                        <AllPosts />
                    </Suspense>
                </aside>
            </div>
        </div>
    )
}