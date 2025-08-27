# Three-Site Setup Guide

This guide will help you set up three separate sites, each with their own domain and purpose.

## 🌐 **Site Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Landing Page                                 │
│                 (diabetesplatforms.com)                         │
│              Simple redirect site with 2 buttons               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │                                                 │
        ▼                                                 ▼
┌─────────────────┐                           ┌─────────────────┐
│   Personal      │                           │  Policymakers   │
│   Platform      │                           │   Dashboard     │
│(boostt1d.com)   │                           │(insulinaccess.org)│
│                 │                           │                 │
│ • User auth     │                           │ • Risk mapping  │
│ • Glucose tracking│                         │ • District data │
│ • Therapy AI    │                           │ • Policy tools  │
│ • Nightscout    │                           │ • Legislation   │
└─────────────────┘                           └─────────────────┘
```

## 🚀 **Deployment Steps**

### **Step 1: Personal Platform (boostt1d.com)**
**Current Status**: ✅ Already deployed on Vercel

**What to do**:
1. Keep your current Vercel project
2. Ensure domain `boostt1d.com` is configured
3. Update any internal links to point to the new landing page

### **Step 2: Policymakers Dashboard (insulinaccess.org)**
**Current Status**: ⏳ Needs to be deployed separately

**What to do**:
1. **Create new Vercel project**:
   ```bash
   cd /Users/faina/CAC/ia2
   vercel --prod
   ```

2. **Configure domain**:
   - Go to Vercel dashboard
   - Add custom domain: `insulinaccess.org`
   - Configure DNS settings

3. **Deploy the dashboard**:
   ```bash
   npm run build
   vercel --prod
   ```

### **Step 3: Landing Page (diabetesplatforms.com)**
**Current Status**: ✅ Created in your current project

**What to do**:
1. **Deploy as separate project**:
   - Create new Vercel project for landing page only
   - Or use current project and configure domain

2. **Configure domain**:
   - Add custom domain: `diabetesplatforms.com`
   - Update DNS settings

## 🔧 **Technical Setup**

### **Option A: Three Separate Vercel Projects (Recommended)**

#### **Project 1: Personal Platform**
- **Repository**: Your current BoostT1D repo
- **Domain**: `boostt1d.com`
- **Framework**: Next.js
- **Purpose**: Diabetes management app

#### **Project 2: Policymakers Dashboard**
- **Repository**: CAC/ia2 repo
- **Domain**: `insulinaccess.org`
- **Framework**: Next.js
- **Purpose**: Policy analysis and mapping

#### **Project 3: Landing Page**
- **Repository**: New repo (or current one)
- **Domain**: `diabetesplatforms.com`
- **Framework**: Next.js
- **Purpose**: Simple redirect site

### **Option B: Single Vercel Project with Multiple Domains**
- One Vercel project
- Multiple domains pointing to different routes
- More complex but single deployment

## 📁 **File Structure for Landing Page**

```
landing-page/
├── src/
│   └── app/
│       ├── page.tsx          # Landing page with 2 buttons
│       ├── layout.tsx        # Basic layout
│       └── globals.css       # Styling
├── public/                   # Images, icons
├── package.json
├── next.config.js
└── tailwind.config.js
```

## 🌍 **Domain Configuration**

### **DNS Settings for Each Domain**

#### **boostt1d.com**
```
Type: A
Name: @
Value: 76.76.19.76 (Vercel IP)
```

#### **insulinaccess.org**
```
Type: A
Name: @
Value: 76.76.19.76 (Vercel IP)
```

#### **diabetesplatforms.com**
```
Type: A
Name: @
Value: 76.76.19.76 (Vercel IP)
```

## 🎯 **Benefits of This Setup**

1. **Clean Separation**: Each site has its own purpose and codebase
2. **Independent Deployment**: Update one without affecting others
3. **Different Technologies**: Can use different frameworks if needed
4. **Scalability**: Each site scales independently
5. **Maintenance**: Easier to maintain and debug
6. **SEO**: Each site optimized for its specific audience
7. **Team Management**: Different teams can work on each site

## 🔄 **Workflow**

### **Development Workflow**
1. **Personal Platform**: Develop diabetes management features
2. **Policy Dashboard**: Develop mapping and analysis tools
3. **Landing Page**: Update redirects and branding

### **Deployment Workflow**
1. **Test locally** on each project
2. **Deploy to staging** (if needed)
3. **Deploy to production** on each Vercel project
4. **Verify domains** are working correctly

## 🚨 **Important Notes**

1. **Cross-Origin**: Each site is independent, so no CORS issues
2. **Authentication**: Each site manages its own user sessions
3. **Data Sharing**: Sites can share data via APIs if needed
4. **Branding**: Consistent branding across all three sites
5. **Analytics**: Track each site separately

## 📱 **Mobile Considerations**

- All sites are responsive
- Touch-friendly buttons and navigation
- Fast loading times
- Progressive Web App capabilities

## 🔍 **SEO Strategy**

- **Personal Platform**: Target diabetes management keywords
- **Policy Dashboard**: Target policy and research keywords
- **Landing Page**: Target general diabetes platform keywords
- Each site can have its own meta tags and sitemap

## 🎉 **Next Steps**

1. **Deploy landing page** to Vercel
2. **Deploy policymakers dashboard** to Vercel
3. **Configure domains** and DNS
4. **Test all redirects** and functionality
5. **Monitor performance** and user experience

## 📞 **Support**

If you need help with any of these steps:
- **Vercel Documentation**: https://vercel.com/docs
- **Domain Configuration**: Check your domain registrar's DNS settings
- **Deployment Issues**: Check Vercel build logs and error messages
