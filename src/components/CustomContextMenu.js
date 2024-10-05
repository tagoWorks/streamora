import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export function CustomContextMenu({ children }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Profile</ContextMenuItem>
        <ContextMenuItem>Settings</ContextMenuItem>
        <ContextMenuItem>Log out</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}