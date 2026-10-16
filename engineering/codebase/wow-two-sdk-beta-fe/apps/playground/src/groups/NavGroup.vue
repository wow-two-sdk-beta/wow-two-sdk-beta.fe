<script setup lang="ts">
import {
  CommandPaletteModal,
  CommandPaletteModalContent,
  CommandPaletteModalInput,
  CommandPaletteModalList,
  CommandPaletteModalGroup,
  CommandPaletteModalItem,
  CommandPaletteModalEmpty,
  CommandPaletteModalSeparator,
} from '@wow-two-beta/ui-vue/presentation/overlays';
import { ref } from 'vue';
import * as nav from '@wow-two-beta/ui-vue/presentation/nav';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { CountBadge } from '@wow-two-beta/ui-vue/presentation/display';
import { FolderKanban, Home, Inbox, Settings } from 'lucide-vue-next';
import Demo from '../gallery/Demo.vue';
import AutoGroup from '../gallery/AutoGroup.vue';
import { navExamples } from '../gallery/fixtures/NavExamples';

const {
  Breadcrumb,
  Pagination,
  NavItem,
  Menu,
  MenuItem,
  MenuLabel,
  MenuGroup,
  MenuSeparator,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  ScrollSpy,
  TableOfContents,
  BottomNavMenu,
  BottomNavMenuItem,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuGroup,
  SidebarMenuSection,
} = nav;

/** Whether the sidebar demo shows as an icon rail. */
const isRail = ref(false);

const covered = [
  'Breadcrumb',
  'Pagination',
  'NavItem',
  'Menu',
  'MenuItem',
  'MenuLabel',
  'MenuGroup',
  'MenuSeparator',
  'MenuCheckboxItem',
  'MenuRadioGroup',
  'MenuRadioItem',
  'MenuSub',
  'BottomNavMenu',
  'BottomNavMenuItem',
  'SidebarMenu',
  'SidebarMenuItem',
  'SidebarMenuGroup',
  'SidebarMenuSection',
  'MenuSubTrigger',
  'MenuSubContent',
  'DropdownMenu',
  'DropdownMenuTrigger',
  'DropdownMenuContent',
  'ContextMenu',
  'ContextMenuTrigger',
  'ContextMenuContent',
  'Menubar',
  'MenubarMenu',
  'MenubarTrigger',
  'MenubarContent',
  'NavigationMenu',
  'NavigationMenuList',
  'NavigationMenuItem',
  'NavigationMenuTrigger',
  'NavigationMenuContent',
  'NavigationMenuLink',
  'CommandPaletteModal',
  'CommandPaletteModalContent',
  'CommandPaletteModalInput',
  'CommandPaletteModalList',
  'CommandPaletteModalGroup',
  'CommandPaletteModalItem',
  'CommandPaletteModalEmpty',
  'CommandPaletteModalSeparator',
  'ScrollSpy',
  'TableOfContents',
];

const page = ref(4);
const paletteOpen = ref(false);
const menuOpen = ref(false);
const showHidden = ref(false);
const sortBy = ref<string | null>('name');
const menuAnchor = ref<HTMLElement | null>(null);
</script>

<template>
  <div class="space-y-6">
    <h2 class="font-mono text-sm font-bold uppercase tracking-wide">nav</h2>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
      <Demo name="Breadcrumb" note="separator should draw between every pair">
        <Breadcrumb
          :items="[
            { label: 'Home', href: '#' },
            { label: 'Projects', href: '#' },
            { label: 'wow-two', href: '#' },
            { label: 'Current' },
          ]"
        />
      </Demo>

      <Demo name="Pagination" note="page 4 of 12 — siblings 1, first/last visible">
        <div class="space-y-2">
          <Pagination v-model:page="page" :total="12" />
          <Pagination :page="page" :total="12" :siblings="2" :show-first-last="false" />
          <p class="text-xs text-subtle-foreground">page = {{ page }}</p>
        </div>
      </Demo>

      <Demo name="NavItem" note="size axis + active state + icon/trailing slots">
        <div class="w-56 space-y-1">
          <NavItem v-for="s in ['sm', 'md', 'lg']" :key="s" :size="s as never">
            <template #icon><Home :size="14" /></template>
            Dashboard ({{ s }})
          </NavItem>
          <NavItem is-active>
            <template #icon><Inbox :size="14" /></template>
            Active item
            <template #trailing>
              <span class="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground"> 12 </span>
            </template>
          </NavItem>
          <NavItem>
            <template #icon><Settings :size="14" /></template>
            Settings
          </NavItem>
        </div>
      </Demo>

      <Demo name="Menu" note="anchored to the button — `anchor` is a REQUIRED prop, not a trigger slot">
        <button ref="menuAnchor" type="button" class="mb-2 rounded-md border border-border px-2 py-1 text-xs">
          anchor element
        </button>
        <Menu :open="true" :anchor="menuAnchor" class="w-56">
          <MenuLabel>Account</MenuLabel>
          <MenuGroup label="Workspace">
            <MenuItem>Profile</MenuItem>
            <MenuItem>Billing</MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem state="destructive">Delete workspace</MenuItem>
          <MenuItem is-disabled>Disabled item</MenuItem>
        </Menu>
      </Demo>

      <Demo name="DropdownMenu" note="checkbox, radio and submenu rows — hover or ArrowRight opens Share">
        <DropdownMenu v-model:open="menuOpen">
          <DropdownMenuTrigger>
            <Button variant="outline" size="sm">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-56">
            <MenuItem>New file</MenuItem>
            <MenuSub>
              <MenuSubTrigger>Share</MenuSubTrigger>
              <MenuSubContent class="w-44">
                <MenuItem>Copy link</MenuItem>
                <MenuItem>Email</MenuItem>
              </MenuSubContent>
            </MenuSub>
            <MenuSeparator />
            <MenuCheckboxItem v-model="showHidden">Show hidden files</MenuCheckboxItem>
            <MenuRadioGroup v-model="sortBy" label="Sort by">
              <MenuRadioItem value="name">Name</MenuRadioItem>
              <MenuRadioItem value="date">Date modified</MenuRadioItem>
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem state="destructive">Delete</MenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <p class="mt-1 text-xs text-subtle-foreground">
          open = {{ menuOpen }} · hidden = {{ showHidden }} · sort = {{ sortBy }}
        </p>
      </Demo>

      <Demo name="ContextMenu" note="right-click the grey box">
        <ContextMenu>
          <ContextMenuTrigger>
            <div class="grid h-20 place-items-center rounded-md bg-muted text-xs">right-click me</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <MenuItem>Cut</MenuItem>
            <MenuItem>Copy</MenuItem>
            <MenuItem>Paste</MenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Demo>

      <Demo name="Menubar" note="click a top-level trigger">
        <Menubar>
          <MenubarMenu value="file">
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenuItem>New</MenuItem>
              <MenuItem>Open…</MenuItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu value="edit">
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenuItem>Undo</MenuItem>
              <MenuItem>Redo</MenuItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Demo>

      <Demo name="NavigationMenu">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem value="products">
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div class="w-56 space-y-1 p-2">
                  <NavigationMenuLink href="#">SDK</NavigationMenuLink>
                  <NavigationMenuLink href="#">Platform</NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="docs">
              <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div class="w-56 p-2"><NavigationMenuLink href="#">Guides</NavigationMenuLink></div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Demo>

      <Demo name="CommandPaletteModal" note="click to open the portalled palette">
        <Button variant="outline" size="sm" @click="paletteOpen = true">Open palette</Button>
        <CommandPaletteModal v-model:open="paletteOpen">
          <CommandPaletteModalContent>
            <CommandPaletteModalInput placeholder="Type a command…" />
            <CommandPaletteModalList>
              <CommandPaletteModalGroup label="Files">
                <CommandPaletteModalItem value="new-file" search-text="new file">New file</CommandPaletteModalItem>
                <CommandPaletteModalItem value="open-file" search-text="open file">Open file</CommandPaletteModalItem>
              </CommandPaletteModalGroup>
              <CommandPaletteModalSeparator />
              <CommandPaletteModalGroup label="Settings">
                <CommandPaletteModalItem value="theme" search-text="theme">Change theme</CommandPaletteModalItem>
              </CommandPaletteModalGroup>
              <CommandPaletteModalEmpty>No results.</CommandPaletteModalEmpty>
            </CommandPaletteModalList>
          </CommandPaletteModalContent>
        </CommandPaletteModal>
      </Demo>

      <Demo name="ScrollSpy" note="scroll the inner box — the active id should follow">
        <ScrollSpy :ids="['s1', 's2', 's3']">
          <template #default="{ activeId }">
            <div>
              <p class="mb-1 text-xs text-subtle-foreground">active = {{ activeId ?? 'null' }}</p>
              <div class="h-24 overflow-auto rounded-md border border-border">
                <div v-for="id in ['s1', 's2', 's3']" :id="id" :key="id" class="h-16 p-2 text-xs">section {{ id }}</div>
              </div>
            </div>
          </template>
        </ScrollSpy>
      </Demo>

      <Demo name="SidebarMenu" note="section + collapsible group · toggle the icon rail below">
        <div class="flex flex-col items-start gap-2">
          <div :class="isRail ? 'w-14' : 'w-56'" class="rounded-md border border-border p-2 transition-[width]">
            <SidebarMenu :is-collapsed="isRail">
              <SidebarMenuSection label="Workspace">
                <SidebarMenuItem href="#home" is-active>
                  <template #icon><Home class="size-4" /></template>
                  Home
                </SidebarMenuItem>
                <SidebarMenuItem href="#inbox">
                  <template #icon><Inbox class="size-4" /></template>
                  <template #trailing><CountBadge :value="12" /></template>
                  Inbox
                </SidebarMenuItem>
                <SidebarMenuGroup label="Projects" default-open>
                  <template #icon><FolderKanban class="size-4" /></template>
                  <SidebarMenuItem href="#atlas">Atlas</SidebarMenuItem>
                  <SidebarMenuItem href="#beacon">Beacon</SidebarMenuItem>
                </SidebarMenuGroup>
              </SidebarMenuSection>
              <SidebarMenuSection label="Account">
                <SidebarMenuItem href="#settings">
                  <template #icon><Settings class="size-4" /></template>
                  Settings
                </SidebarMenuItem>
              </SidebarMenuSection>
            </SidebarMenu>
          </div>
          <Button size="sm" variant="soft" @click="isRail = !isRail">{{
            isRail ? 'Expand' : 'Collapse to rail'
          }}</Button>
        </div>
      </Demo>

      <Demo name="BottomNavMenu" note="in flow here (is-fixed=false) · Inbox carries a badge">
        <div class="overflow-hidden rounded-md border border-border">
          <BottomNavMenu :is-fixed="false">
            <BottomNavMenuItem href="#home" is-active>
              <template #icon><Home class="size-5" /></template>
              Home
            </BottomNavMenuItem>
            <BottomNavMenuItem href="#inbox">
              <template #icon><Inbox class="size-5" /></template>
              <template #badge><CountBadge :value="3" /></template>
              Inbox
            </BottomNavMenuItem>
            <BottomNavMenuItem href="#settings">
              <template #icon><Settings class="size-5" /></template>
              Settings
            </BottomNavMenuItem>
          </BottomNavMenu>
        </div>
      </Demo>

      <Demo name="TableOfContents">
        <TableOfContents
          :items="[
            { id: 'a', label: 'Overview', depth: 0 },
            { id: 'b', label: 'Install', depth: 0 },
            { id: 'c', label: 'Peer deps', depth: 1 },
          ]"
          active-id="b"
        />
      </Demo>
    </div>

    <h3 class="border-t border-border pt-4 font-mono text-xs uppercase text-subtle-foreground">auto-mounted tail</h3>
    <AutoGroup :examples="navExamples" :namespace="nav" :covered="covered" />
  </div>
</template>
