import React, { useMemo, useState } from 'react';
import { ToolType } from '../types/tools';

export interface HomeToolItem {
    id: ToolType;
    name: string;
    icon: string;
}

export interface HomeCategory {
    id: string;
    name: string;
    icon: string;
    tools: HomeToolItem[];
}

interface HomePageProps {
    categories: HomeCategory[];
    onSelectTool: (toolId: ToolType, categoryId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ categories, onSelectTool }) => {
    const [keyword, setKeyword] = useState('');

    const totalTools = useMemo(
        () => categories.reduce((sum, category) => sum + category.tools.length, 0),
        [categories]
    );

    const filteredCategories = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return categories;

        return categories
            .map(category => ({
                ...category,
                tools: category.tools.filter(
                    tool =>
                        tool.name.toLowerCase().includes(q) ||
                        tool.id.toLowerCase().includes(q) ||
                        category.name.toLowerCase().includes(q)
                ),
            }))
            .filter(category => category.tools.length > 0);
    }, [categories, keyword]);

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-1 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                        全部工具
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
                        共 {categories.length} 个分类、{totalTools} 个工具，点击即可进入。
                    </p>
                </div>

                <div className="relative w-full sm:w-72">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400">
                        search
                    </span>
                    <input
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="搜索工具或分类..."
                        className="w-full rounded-xl border border-border-light bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary dark:border-border-dark dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
            </div>

            {filteredCategories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-light px-6 py-16 text-center dark:border-border-dark">
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600">
                        search_off
                    </span>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        未找到与「{keyword}」相关的工具
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {filteredCategories.map(category => (
                        <section key={category.id} className="scroll-mt-6">
                            <div className="mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-2xl text-primary">
                                    {category.icon}
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {category.name}
                                </h3>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                    {category.tools.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {category.tools.map(tool => (
                                    <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => onSelectTool(tool.id, category.id)}
                                        className="group flex flex-col items-start gap-3 rounded-2xl border border-border-light bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-border-dark dark:bg-gray-800 dark:hover:border-primary/40"
                                    >
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                            <span className="material-symbols-outlined text-2xl">
                                                {tool.icon}
                                            </span>
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {tool.name}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                {category.name}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HomePage;
