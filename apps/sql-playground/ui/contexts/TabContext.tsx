import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	cleanupOrphanedData,
	loadPanelSizes,
	removePanelSizes,
	savePanelSizes,
} from "../lib/panelStorage";
import type { PanelSizes, Tab } from "../types/tab";

interface TabContextType {
	tabs: Tab[];
	activeTabId: string | null;
	createTab: (initialData?: Partial<Tab>) => void;
	closeTab: (tabId: string) => void;
	updateTab: (tabId: string, updates: Partial<Tab>) => void;
	setActiveTab: (tabId: string) => void;
	getTab: (tabId: string) => Tab | undefined;
	findTabByQuery: (queryId: string, versionNumber?: number) => Tab | undefined;
	createOrFocusTab: (
		initialData: Partial<Tab> & {
			queryId?: string;
			currentVersionNumber?: number;
		},
	) => void;
	savePanelSizes: (tabId: string, sizes: PanelSizes) => void;
	loadPanelSizes: (tabId: string) => PanelSizes | null;
	updateTabPanelSizes: (tabId: string, sizes: PanelSizes) => void;
}

const TabContext = createContext<TabContextType | null>(null);

interface TabProviderProps {
	children: ReactNode;
}

export function TabProvider({ children }: TabProviderProps) {
	const [tabs, setTabs] = useState<Tab[]>([]);
	const [activeTabId, setActiveTabId] = useState<string | null>(null);

	// Clean up orphaned panel size data when tabs change
	useEffect(() => {
		const activeTabIds = tabs.map(tab => tab.id);
		cleanupOrphanedData(activeTabIds);
	}, [tabs]);

	const createTab = useCallback(
		(initialData: Partial<Tab> = {}) => {
			const id = `tab-${Date.now()}-${Math.random()}`;

			// Load saved panel sizes for this tab
			const savedPanelSizes = loadPanelSizes(id);

			const newTab: Tab = {
				id,
				title: `Query ${tabs.length + 1}`,
				query: "",
				result: null,
				error: null,
				isLoading: false,
				lastExecuted: null,
				...(savedPanelSizes && { panelSizes: savedPanelSizes }),
				...initialData,
			};

			setTabs((prev) => [...prev, newTab]);
			setActiveTabId(id);
		},
		[tabs.length],
	);

	const closeTab = useCallback(
		(tabId: string) => {
			setTabs((prev) => {
				const filtered = prev.filter((tab) => tab.id !== tabId);

				// If we're closing the active tab, select a new one
				if (activeTabId === tabId) {
					const currentIndex = prev.findIndex((tab) => tab.id === tabId);
					const newActiveTab =
						filtered[Math.min(currentIndex, filtered.length - 1)];
					setActiveTabId(newActiveTab?.id || null);
				}

				return filtered;
			});

			// Clean up panel sizes for the closed tab
			removePanelSizes(tabId);
		},
		[activeTabId],
	);

	const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
		setTabs((prev) =>
			prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
		);

		// Save panel sizes if they're being updated
		if (updates.panelSizes) {
			savePanelSizes(tabId, updates.panelSizes);
		}
	}, []);

	const setActiveTab = useCallback((tabId: string) => {
		setActiveTabId(tabId);
	}, []);

	const getTab = useCallback(
		(tabId: string) => {
			return tabs.find((tab) => tab.id === tabId);
		},
		[tabs],
	);

	const findTabByQuery = useCallback(
		(queryId: string, versionNumber?: number) => {
			return tabs.find(
				(tab) =>
					tab.queryId === queryId &&
					(versionNumber === undefined ||
						tab.currentVersionNumber === versionNumber),
			);
		},
		[tabs],
	);

	const createOrFocusTab = useCallback(
		(
			initialData: Partial<Tab> & {
				queryId?: string;
				currentVersionNumber?: number;
			},
		) => {
			// Try to find existing tab with the same query and version
			const existingTab = initialData.queryId
				? findTabByQuery(initialData.queryId, initialData.currentVersionNumber)
				: null;

			if (existingTab) {
				// Focus existing tab instead of creating new one
				setActiveTab(existingTab.id);
			} else {
				// Create new tab
				createTab(initialData);
			}
		},
		[findTabByQuery, createTab, setActiveTab],
	);

	const savePanelSizesCallback = useCallback((tabId: string, sizes: PanelSizes) => {
		savePanelSizes(tabId, sizes);
	}, []);

	const loadPanelSizesCallback = useCallback((tabId: string) => {
		return loadPanelSizes(tabId);
	}, []);

	const updateTabPanelSizesCallback = useCallback((tabId: string, sizes: PanelSizes) => {
		savePanelSizes(tabId, sizes);
		updateTab(tabId, { panelSizes: sizes });
	}, [updateTab]);

	const value: TabContextType = {
		tabs,
		activeTabId,
		createTab,
		closeTab,
		updateTab,
		setActiveTab,
		getTab,
		findTabByQuery,
		createOrFocusTab,
		savePanelSizes: savePanelSizesCallback,
		loadPanelSizes: loadPanelSizesCallback,
		updateTabPanelSizes: updateTabPanelSizesCallback,
	};

	return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useTabContext() {
	const context = useContext(TabContext);
	if (!context) {
		throw new Error("useTabContext must be used within a TabProvider");
	}
	return context;
}
