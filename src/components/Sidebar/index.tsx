import { BellIcon, HomeIcon, LineChartIcon, PackageIcon, PaperclipIcon, UsersIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "../ui/button"

export const Sidebar = () => {
  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-[60px] items-center border-b px-6">
        <Link href="#" className="flex items-center gap-2 font-semibold" prefetch={false}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={100}
            height={33}

          />
        </Link>
        <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
          <BellIcon className="h-4 w-4" />
          <span className="sr-only">Notificações</span>
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            prefetch={false}
          >
            <HomeIcon className="h-4 w-4" />
            Inicio
          </Link>
          <Link
            href="/categorias"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            prefetch={false}
          >
            <PaperclipIcon className="h-4 w-4" />
            Categorias
            {/* <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">6</Badge> */}
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary  transition-all hover:text-primary"
            prefetch={false}
          >
            <PackageIcon className="h-4 w-4" />
            Produtos{" "}
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            prefetch={false}
          >
            <UsersIcon className="h-4 w-4" />
            Customers
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            prefetch={false}
          >
            <LineChartIcon className="h-4 w-4" />
            Analytics
          </Link>
        </nav>
      </div>
    </div>
  )
}