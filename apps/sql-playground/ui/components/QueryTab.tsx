import { useCallback, useMemo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useTabContext } from "../contexts/TabContext";
import type { PanelSizes, Tab } from "../types/tab";
import { QueryEditor } from "./QueryEditor";
import { BottomPanel } from "./BottomPanel";
import { QueryVersionHistory } from "./QueryVersionHistory";

interface QueryTabProps {
	tab: Tab;
}

export function QueryTab({ tab }: QueryTabProps) {
	const { updateTabPanelSizes } = useTabContext();

	// Extract panel sizes from tab data with fallback to default [40, 60]
	const panelSizes = useMemo<PanelSizes>(() => {
		return tab.panelSizes || [40, 60];
	}, [tab.panelSizes]);

	// Handle layout changes with optimized callback
	const handleLayoutChange = useCallback(
		(sizes: number[]) => {
			const newSizes: PanelSizes = [sizes[0], sizes[1]];
			updateTabPanelSizes(tab.id, newSizes);
		},
		[updateTabPanelSizes, tab.id],
	);

	return (
		<PanelGroup
			direction="vertical"
			className="h-full"
			onLayout={handleLayoutChange}
		>
			<Panel defaultSize={panelSizes[0]} minSize={20}>
				<div className="h-full flex">
					<div className="flex-1">
						<QueryEditor tab={tab} />
					</div>
					<QueryVersionHistory tab={tab} />
				</div>
			</Panel>

			<PanelResizeHandle className="h-1 bg-border hover:bg-primary/20 transition-colors" />

			<Panel defaultSize={panelSizes[1]} minSize={20}>
				<BottomPanel tab={tab} />
			</Panel>
		</PanelGroup>
	);
}
