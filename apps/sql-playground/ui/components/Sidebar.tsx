import { Database, History, Plus } from "lucide-react";
import { useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTabContext } from "../contexts/TabContext";
import { QueryHistory } from "./QueryHistory";
import { SchemaExplorer } from "./SchemaExplorer";

interface SidebarProps {
	width: number;
	onResize: (width: number) => void;
}

export function Sidebar({ width }: SidebarProps) {
	const [activeTab, setActiveTab] = useState<"history" | "schema">("history");
	const { createTab } = useTabContext();

	const handleNewQuery = () => {
		createTab();
	};

	return (
		<div className="h-full border-r bg-muted/30" style={{ width }}>
			<div className="flex flex-col h-full">
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-lg font-semibold">SQL Playground</h2>
					<Button size="sm" onClick={handleNewQuery}>
						<Plus className="w-4 h-4 mr-2" />
						New Query
					</Button>
				</div>

				<div className="flex border-b">
					<Button
						variant={activeTab === "history" ? "default" : "ghost"}
						size="sm"
						className="flex-1 rounded-none"
						onClick={() => setActiveTab("history")}
					>
						<History className="w-4 h-4 mr-2" />
						History
					</Button>
					<Button
						variant={activeTab === "schema" ? "default" : "ghost"}
						size="sm"
						className="flex-1 rounded-none"
						onClick={() => setActiveTab("schema")}
					>
						<Database className="w-4 h-4 mr-2" />
						Schema
					</Button>
				</div>

				<ScrollArea className="flex-1">
					{activeTab === "history" && <QueryHistory />}
					{activeTab === "schema" && <SchemaExplorer />}
				</ScrollArea>
			</div>
		</div>
	);
}
