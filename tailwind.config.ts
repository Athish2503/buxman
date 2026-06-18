import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				surface: {
					DEFAULT: 'hsl(var(--surface-1))',
					1: 'hsl(var(--surface-1))',
					2: 'hsl(var(--surface-2))',
					3: 'hsl(var(--surface-3))',
					4: 'hsl(var(--surface-4))',
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))',
					light: 'hsl(var(--primary-light))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))',
					light: 'hsl(var(--secondary-light))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					light: 'hsl(var(--accent-light))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					light: 'hsl(var(--destructive-light))',
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					light: 'hsl(var(--success-light))',
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))',
					light: 'hsl(var(--warning-light))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					border: 'hsl(var(--card-border))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				xs:    'var(--radius-xs)',
				sm:    'var(--radius-sm)',
				DEFAULT: 'var(--radius)',
				md:    'var(--radius)',
				lg:    'var(--radius-lg)',
				xl:    'var(--radius-xl)',
				'2xl': 'var(--radius-2xl)',
				full:  'var(--radius-full)',
			},
			boxShadow: {
				xs:           'var(--shadow-xs)',
				sm:           'var(--shadow-sm)',
				md:           'var(--shadow-md)',
				lg:           'var(--shadow-lg)',
				xl:           'var(--shadow-xl)',
				glow:         'var(--shadow-glow)',
				'glow-mint':  'var(--shadow-glow-mint)',
				'glow-coral': 'var(--shadow-glow-coral)',
			},
			backgroundImage: {
				'gradient-brand':   'var(--gradient-brand)',
				'gradient-mint':    'var(--gradient-mint)',
				'gradient-coral':   'var(--gradient-coral)',
				'gradient-primary': 'var(--gradient-brand)',
				'gradient-card':    'var(--gradient-card)',
				'gradient-aurora':  'var(--gradient-aurora)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-warning': 'var(--gradient-warning)',
			},
			transitionTimingFunction: {
				'smooth':   'var(--ease-smooth)',
				'spring':   'var(--ease-spring)',
				'out-expo': 'var(--ease-out-expo)',
				'bounce':   'var(--ease-bounce)',
			},
			fontFamily: {
				sans:    ['Inter', 'system-ui', 'sans-serif'],
				display: ['Inter', 'system-ui', 'sans-serif'],
				mono:    ['JetBrains Mono', 'monospace'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to:   { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to:   { height: '0' }
				},
				'reward-burst': {
					'0%':   { transform: 'scale(0.8)', opacity: '0' },
					'40%':  { transform: 'scale(1.18)', opacity: '1' },
					'70%':  { transform: 'scale(0.96)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'number-flip': {
					from: { transform: 'translateY(40%)', opacity: '0', filter: 'blur(4px)' },
					to:   { transform: 'translateY(0)',   opacity: '1', filter: 'blur(0)' }
				},
				'float-y': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%':      { transform: 'translateY(-6px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up':   'accordion-up 0.2s ease-out',
				'reward-burst':   'reward-burst 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
				'number-flip':    'number-flip 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
				'float-y':        'float-y 3s ease-in-out infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
