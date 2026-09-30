/** @type {import('tailwindcss').Config} */
const warmNeutral = {
  50: '#f7f2e8', 100: '#e9e9d9', 200: '#ded9c9', 300: '#c8c4b3',
  400: '#8e8c7d', 500: '#716e5e', 600: '#635f51', 700: '#4e5142',
  800: '#3b4636', 900: '#2f402e', 950: '#293b2b',
}
const leaf = {
  50: '#f0f3e9', 100: '#e5ebdb', 200: '#d0dcc1', 300: '#b2c39f',
  400: '#839b72', 500: '#5b7a51', 600: '#486640', 700: '#34513c',
  800: '#2b4432', 900: '#23392a', 950: '#192c20',
}
const terracotta = {
  50: '#fbf1e9', 100: '#f5e0ce', 200: '#eac4a4', 300: '#dca680',
  400: '#c67a52', 500: '#b45e36', 600: '#a84b2b', 700: '#934125',
  800: '#783821', 900: '#62301f', 950: '#3e1f15',
}

module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			fontFamily: {
				sans: ['"DM Sans"', 'Arial', 'sans-serif'],
				display: ['"Source Serif 4"', 'Georgia', 'serif'],
			},
			colors: {
				white: '#fffdf8',
				zinc: warmNeutral, gray: warmNeutral, slate: warmNeutral, stone: warmNeutral, neutral: warmNeutral,
				emerald: leaf, green: leaf, blue: leaf, indigo: leaf, violet: leaf,
				orange: terracotta, purple: terracotta,
				brand: {
					DEFAULT: 'var(--site-primary-contrast-color)',
					ink: '#293b2b', paper: '#fffdf8', cream: '#f7f2e8', soft: '#e9e9d9',
					line: '#ded9c9', muted: '#635f51', clay: 'var(--site-secondary-contrast-color)',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'var(--site-primary-contrast-color)',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'var(--site-secondary-contrast-color)',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				accent: {
					DEFAULT: '#a84b2b',
					foreground: 'hsl(var(--accent-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				xl: 'var(--radius)',
				'2xl': 'calc(var(--radius) + 4px)',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			boxShadow: {
				sm: '0 1px 3px rgb(41 59 43 / 0.04)',
				DEFAULT: '0 3px 12px rgb(41 59 43 / 0.06)',
				md: '0 5px 18px rgb(41 59 43 / 0.07)',
				lg: '0 8px 28px rgb(41 59 43 / 0.08)',
				xl: '0 14px 40px rgb(41 59 43 / 0.10)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
