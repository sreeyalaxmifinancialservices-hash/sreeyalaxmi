"use client"

import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    badge?: number
  }[]
  label?: string
}) {
  const pathname = usePathname()
  const { state } = useSidebar()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
            const hasBadge = Boolean(item.badge && item.badge > 0)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  render={<a href={item.url} />}
                  className="relative rounded-lg transition-all duration-200 text-black dark:text-gray-300 hover:bg-gray-100 hover:text-black dark:hover:bg-gray-800 dark:hover:text-white data-[active=true]:bg-black data-[active=true]:text-black dark:data-[active=true]:bg-white dark:data-[active=true]:text-white"
                >
                  {item.icon}
                  <span>{item.title}</span>
                  {hasBadge && state === "expanded" && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                        {item.badge}
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    </span>
                  )}
                </SidebarMenuButton>
                {hasBadge && state === "collapsed" && (
                  <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
