# PrecepGo Mobile App Design System - Frontend Implementation Guide

## Overview
This document describes the visual design system, layout patterns, and styling guidelines for the PrecepGo mobile application. Use this as a reference when building a web frontend that matches the mobile app's look and feel.

---

## Color Palette

### Primary Brand Colors
- **PrecepGo Orange**: `rgba(255, 189, 85, 1.0)` / `#FFBD55` - Primary action color, buttons, accents
- **PrecepGo Blue**: `#83a0cc` - Primary background color for dashboard screens
- **PrecepGo Dark Orange**: `#E27851` - Secondary action color, selected states

### Card Colors
- **Card Background**: `#f9fafb` - Light gray background for cards
- **Card Title Text**: `rgba(0, 0, 0, 0.87)` - High contrast text for card titles
- **Card Body Text**: `rgba(0, 0, 0, 0.6)` - Medium contrast text for card content

### Background Colors
- **Light Mode Background**: `#f8fafc` - Light blue-gray
- **Dark Mode Background**: `#1e293b` - Dark blue-gray

### Accent Colors
- **Primary Tint (Light)**: `#0a7ea4` - Links, active states
- **Primary Tint (Dark)**: `#ffffff` - Links, active states in dark mode
- **Icon Color**: `#687076` (light), `#9BA1A6` (dark)
- **Tab Icon Selected**: Uses primary tint color

### Semantic Colors
- **Error**: Red shades (500, 600 variants)
- **Success**: Green shades (400, 500 variants)
- **Warning**: Orange/yellow shades
- **Info**: Blue shades

---

## Typography

### Font Family
- **Primary Font**: `Inter` (Regular 400, Medium 500, SemiBold 600, Bold 700)
- **Additional Fonts**: Plus Jakarta Sans, Roboto, Source Code Pro, Space Mono

### Font Sizes
- **Extra Small**: `10px` (2xs)
- **Small**: `12px` - Labels, captions
- **Base**: `14px` - Body text
- **Large**: `18px` - Card titles
- **Extra Large**: `24px` / `2xl` - Section headers
- **2XL**: `2xl` - Large headings

### Font Weights
- **Regular**: `400`
- **Medium**: `500`
- **SemiBold**: `600`
- **Bold**: `700`
- **Extra Black**: `950`

### Text Colors
- **Primary**: `rgba(0, 0, 0, 0.87)` - High contrast
- **Secondary**: `rgba(0, 0, 0, 0.6)` - Medium contrast
- **Muted**: `rgba(0, 0, 0, 0.4)` - Low contrast
- **White**: `#ffffff` - For dark backgrounds

---

## Layout & Spacing

### Container Spacing
- **Screen Padding**: `24px` (`px-6`)
- **Card Padding**: `16px` (`p-4`)
- **Section Spacing**: `24px` (`space-y-6`)
- **Element Spacing**: `16px` (`space-x-4`, `space-y-4`)

### Border Radius
- **Small**: `6px` (`rounded-md`)
- **Medium**: `8px` (`rounded-lg`)
- **Large**: `12px` (`rounded-xl`)
- **Full**: `9999px` (`rounded-full`) - For badges, avatars

### Card Dimensions
- **Card Minimum Height**: `100px`
- **Card Standard Padding**: `16px` (`p-4`)
- **Card Image Height**: `128px` (`h-32`)

---

## Shadows & Elevation

### Shadow Styles
- **Soft-1**: `0px 0px 10px rgba(38, 38, 38, 0.1)`
- **Soft-2**: `0px 0px 20px rgba(38, 38, 38, 0.2)`
- **Hard-1**: `-2px 2px 8px 0px rgba(38, 38, 38, 0.20)`
- **Hard-2**: `0px 3px 10px 0px rgba(38, 38, 38, 0.20)`
- **Hard-5**: `0px 2px 10px 0px rgba(38, 38, 38, 0.10)`

### Standard Shadows
- **Shadow Small**: `shadow-sm` - Subtle elevation for cards
- **Shadow Medium**: Standard box shadow for interactive elements

---

## Components

### Buttons

#### Primary Button
- **Background**: `rgba(255, 189, 85, 1.0)` (PrecepGo Orange)
- **Text Color**: `#ffffff`
- **Padding**: `16px` vertical, `24px` horizontal (`py-4`, `px-6`)
- **Border Radius**: `6px` (`rounded-md`)
- **Font Weight**: `bold`
- **Font Size**: `18px` (`text-lg`)

#### Secondary Button
- **Background**: `#83a0cc` (PrecepGo Blue)
- **Text Color**: `#ffffff`
- **Hover State**: Slightly darker shade

#### Danger Button
- **Background**: `rgba(239, 68, 68, 0.8)` (`bg-red-500/80`)
- **Text Color**: `#ffffff`
- **Hover**: `rgba(220, 38, 38, 0.8)` (`hover:bg-red-600/80`)

### Cards

#### Standard Card
- **Background**: `#f9fafb` (`bg-precepgo-card-bg`)
- **Border Radius**: `12px` (`rounded-xl`)
- **Padding**: `16px` (`p-4`)
- **Shadow**: `shadow-sm` or `hard-5`
- **Margin**: `8px` vertical (`my-2`)

#### Card Button
- **Background**: `#ffffff`
- **Border Radius**: `12px` (`rounded-xl`)
- **Padding**: `20px` (`p-5`)
- **Minimum Height**: `100px`
- **Shadow**: `shadow-sm`
- **Layout**: Flex row with image and text content

### Input Fields

#### Text Input
- **Background**: `#ffffff`
- **Border**: `1px solid #d1d5db` (`border border-gray-300`)
- **Border Radius**: `8px` (`rounded-lg`)
- **Padding**: `24px` vertical (`py-6`)
- **Text Color**: `rgba(0, 0, 0, 0.8)` (`text-gray-800`)
- **Placeholder Color**: `#999999` (`placeholderTextColor="#999"`)
- **Icon Color**: `#657fb0` - Blue-gray for input icons

#### Input with Icon
- Icon positioned on left side
- Icon size: `22px`
- Icon spacing: `12px` left margin (`ml-3`), `8px` right margin (`mr-2`)

### Dashboard Layout

#### Screen Structure
- **Background**: `#83a0cc` (PrecepGo Blue) - Full screen background
- **Content Padding**: `24px` horizontal (`px-6`)
- **Top Padding**: `64px` (`pt-16`) - Accounts for status bar/header
- **Vertical Spacing**: `24px` between sections (`space-y-6`)

#### Dashboard Header
- **Background**: `#f9fafb` (`bg-precepgo-card-bg`)
- **Padding**: `16px` (`px-6 py-4`)
- **Greeting Text**: `24px` bold (`text-2xl font-bold`)
- **Welcome Text**: `16px` base, 80% opacity (`text-base opacity-80`)

### Tables

#### Table Header
- **Background**: Transparent or `#f8f9fa`
- **Border Bottom**: `1px solid #e0e0e0`
- **Padding**: `12px` vertical (`py-3`)
- **Font Size**: `12px`
- **Font Weight**: `600` (`font-semibold`)
- **Text Color**: `#666666` (`text-gray-600`)

#### Table Row
- **Border Bottom**: `1px solid #f0f0f0`
- **Padding**: `12px` vertical (`py-3`)
- **Text Color**: `#333333`

### Badges & Status Indicators

#### Access Badge
- **Admin**: `bg-red-500`
- **Student**: `bg-blue-500`
- **Default**: `bg-gray-500`
- **Padding**: `4px 12px` (`px-3 py-1`)
- **Border Radius**: `9999px` (`rounded-full`)
- **Text Color**: `#ffffff`
- **Font Size**: `12px` (`text-xs`)
- **Font Weight**: `600` (`font-semibold`)

### Loading States

#### Loading Spinner
- **Color**: `rgba(255, 189, 85, 1.0)` (PrecepGo Orange)
- **Size**: `large` or `small`
- **Message**: `rgba(0, 0, 0, 0.6)` text color

#### Card Loader
- **Background**: `#ffffff`
- **Border Radius**: `12px` (`rounded-xl`)
- **Padding**: `16px` (`p-4`)
- **Shadow**: `shadow-sm`

---

## Screen-Specific Design Patterns

### Login Screen
- **Full Screen Background**: `#83a0cc` (PrecepGo Blue)
- **Logo**: Centered at top, `300px` width, `80px` height
- **Form Container**: Centered, max-width `384px` (`max-w-96`)
- **Form Spacing**: `24px` between inputs (`mb-6`)
- **Button Width**: `66.67%` (`w-2/3`)
- **Social Login Buttons**: `80px` × `80px` square buttons
- **Toggle Text**: White with 80% opacity (`text-white/80`)

### Dashboard Screen
- **Full Screen Background**: `#83a0cc` (PrecepGo Blue)
- **Content Container**: White cards on blue background
- **Card Top Image**: `128px` height (`h-32`)
- **Card Overlap**: Negative margin (`-mt-6`) to create overlapping effect
- **Stats Cards**: `flex-1` width, `16px` padding, `rounded-lg`

### Cards & Content Blocks
- **Card Background**: `#f9fafb` (`bg-precepgo-card-bg`)
- **Card Title**: `rgba(0, 0, 0, 0.87)` (`text-precepgo-card-title`)
- **Card Text**: `rgba(0, 0, 0, 0.6)` (`text-precepgo-card-text`)
- **Section Headers**: `18px` semi-bold (`text-lg font-semibold`)

---

## Responsive Design

### Breakpoints
- **Mobile**: Base styles (default)
- **Tablet**: `768px` and above (`isTablet`)
- **Large Screen**: `1024px` and above (`isLargeScreen`)

### Responsive Adjustments
- **Logo Size**: Scales up on larger screens
- **Form Width**: Max-width constraints on larger screens
- **Animation Sizes**: Larger on tablet (`160px` vs `120px`)

---

## Interactive States

### Hover States
- **Buttons**: Slightly darker shade
- **Cards**: Subtle elevation increase
- **Links**: Underline or color change

### Active/Pressed States
- **TouchableOpacity**: `activeOpacity={0.8}` - 80% opacity when pressed
- **Buttons**: Slightly darker background

### Focus States
- **Input Fields**: Border color change or outline
- **Buttons**: Outline or shadow increase

---

## Iconography

### Icon Libraries
- **Material Icons**: Primary icon set
- **Material Community Icons**: Secondary icon set
- **Font Awesome**: Tertiary icon set

### Icon Sizes
- **Small**: `16px`
- **Medium**: `22px` - Input field icons
- **Large**: `24px`
- **Extra Large**: `48px` - Social login buttons

### Icon Colors
- **Default**: `#687076` (light), `#9BA1A6` (dark)
- **Input Icons**: `#657fb0`
- **Selected**: Primary tint color

---

## Animation & Motion

### Rive Animations
- **Login Animation**: `120px` height (mobile), `160px` (tablet)
- **Fit Mode**: `Contain` - Maintains aspect ratio
- **State Machine**: Interactive states for form focus

### Transitions
- **Smooth**: Default React Native transitions
- **Haptic Feedback**: Subtle vibration on important interactions

---

## Dark Mode Support

### Color Adaptations
- **Background**: `#1e293b` (dark blue-gray)
- **Text**: `#ECEDEE` (light gray)
- **Cards**: Darker variant of card background
- **Icons**: `#9BA1A6` (lighter gray)

---

## Implementation Notes

### CSS/Tailwind Equivalents
- Use Tailwind CSS utilities matching the className patterns shown
- Ensure color values match exactly
- Use CSS variables for theme colors if possible
- Implement proper spacing scale (4px, 8px, 12px, 16px, 24px)

### Accessibility
- Ensure sufficient color contrast ratios
- Use semantic HTML elements
- Provide proper ARIA labels
- Support keyboard navigation

### Performance
- Optimize images and animations
- Use CSS transforms for animations
- Minimize re-renders
- Implement proper loading states

---

## Example Component Structure

```html
<!-- Dashboard Card Example -->
<div class="bg-precepgo-card-bg rounded-xl p-4 shadow-sm">
  <h3 class="text-precepgo-card-title text-lg font-semibold mb-4">Card Title</h3>
  <p class="text-precepgo-card-text text-sm">Card content text</p>
</div>

<!-- Primary Button Example -->
<button class="bg-[rgba(255,189,85,1.0)] text-white font-bold text-lg py-4 px-6 rounded-md">
  BUTTON TEXT
</button>

<!-- Input Field Example -->
<div class="bg-white border border-gray-300 rounded-lg py-6 px-3 flex-row items-center">
  <Icon class="text-[#657fb0]" size="22" />
  <input class="text-gray-800 flex-1 ml-2" placeholder="Enter text..." />
</div>
```

---

## Key Design Principles

1. **Consistency**: Use the same colors, spacing, and typography throughout
2. **Hierarchy**: Use size, weight, and color to establish visual hierarchy
3. **Clarity**: Ensure text is readable with proper contrast
4. **Spacing**: Generous whitespace for breathing room
5. **Accessibility**: High contrast ratios and semantic HTML
6. **Mobile-First**: Design for mobile, enhance for larger screens

---

**Last Updated**: Based on PrecepGo Mobile App v0.2a
**Design System Version**: 1.0

