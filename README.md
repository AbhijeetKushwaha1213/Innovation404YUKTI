# Civic Connect - Municipal Issue Reporting Platform

A modern, full-stack web application for citizens to report municipal issues and for authorities to manage and resolve them efficiently.

## 🌟 Features

### For Citizens
- **Report Issues**: Submit municipal problems with photos, location, and descriptions
- **Track Progress**: Monitor issue status in real-time
- **Provide Feedback**: Rate resolutions and provide feedback
- **Community Engagement**: View and upvote community issues
- **Success Stories**: See resolved issues and their impact

### For Officials/Workers
- **Department Portal**: Dedicated interface for municipal workers
- **Issue Management**: View, assign, and update issue status
- **Photo Documentation**: Upload before/after photos of resolutions
- **Dashboard Analytics**: Track department performance and metrics
- **Worker Profiles**: Manage employee information and assignments

### For Administrators
- **Authority Dashboard**: Comprehensive overview of all issues
- **Worker Assignment**: Assign issues to specific departments/workers
- **Access Control**: Manage official accounts and permissions
- **Notifications**: Receive alerts on citizen feedback
- **Analytics**: View system-wide statistics and trends

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Maps**: Google Maps API
- **AI**: Google Cloud Vision API (optional, for image analysis)
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/bun
- Supabase account
- Google Maps API key
- Google Cloud Vision API key (optional)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civic-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   VITE_GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key (optional)
   ```

4. **Set up the database**
   
   Run the migration scripts in your Supabase SQL editor:
   ```bash
   # See docs/migration/ for all migration files
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
civic-connect/
├── src/
│   ├── features/              # Feature-based modules
│   │   ├── auth/             # Authentication
│   │   ├── issues/           # Issue management
│   │   ├── official/         # Official portal
│   │   ├── profile/          # User profiles
│   │   └── events/           # Community events
│   ├── shared/               # Shared resources
│   │   ├── components/       # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript types
│   │   └── lib/              # Third-party configs
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── docs/                     # Documentation
│   ├── setup/               # Setup guides
│   ├── features/            # Feature documentation
│   └── migration/           # Database migrations
└── public/                   # Static assets
```

## 🔑 Key Features Explained

### Issue Reporting
Citizens can report issues with:
- Photo upload (with AI-powered analysis)
- GPS location or manual address entry
- Category selection
- Detailed description
- Duplicate detection to prevent spam

### Official Portal
Municipal workers access a dedicated portal to:
- View assigned issues
- Update issue status
- Upload resolution photos
- Complete worker profiles
- Track department metrics

### Citizen Feedback System
After an issue is marked as resolved:
- Citizens receive a notification
- They can rate the resolution (satisfied/not satisfied)
- Feedback is sent to administrators
- Issues can be reopened if unsatisfactory

### Real-time Updates
- Live issue status updates
- Real-time notifications
- Instant dashboard metrics
- WebSocket-based communication

## 🔐 Authentication

The app supports multiple authentication methods:
- Email/Password
- Google OAuth
- Magic Link (email)

### User Roles
1. **Citizen**: Can report and track issues
2. **Official/Worker**: Can manage assigned issues
3. **Administrator**: Full system access

## 📱 Responsive Design

The application is fully responsive and works seamlessly on:
- Desktop computers
- Tablets
- Mobile phones

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

See `docs/setup/DEPLOYMENT.md` for detailed instructions.

## 📚 Documentation

- [Database Setup](docs/setup/DATABASE_SETUP.md)
- [Google Maps Integration](docs/setup/GOOGLE_MAPS_SETUP.md)
- [Official Portal Guide](docs/features/OFFICIAL_PORTAL.md)
- [Citizen Feedback System](docs/features/CITIZEN_FEEDBACK.md)
- [Worker Onboarding](docs/features/WORKER_ONBOARDING.md)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Worker Photo Upload Error
If workers get "permission denied for table users" when uploading photos:

**Quick Fix**: Run `QUICK_FIX_PHOTO_UPLOAD.md` script in Supabase SQL Editor

**Full Guide**: See `docs/FIX_WORKER_PHOTO_UPLOAD.md` for detailed instructions

**Diagnostic**: Run `DIAGNOSE_PERMISSION_ISSUE.sql` to identify the exact issue

### Upvote Feature Not Working
If upvotes are not persisting or not working correctly:

**Quick Fix**: Run `QUICK_FIX_UPVOTES.md` - takes 3 steps, 2 minutes

**Full Guide**: See `docs/FIX_UPVOTE_FEATURE.md` for detailed instructions

**What it fixes**: Migrates from localStorage to proper database tracking

### Other Common Issues
- **Database schema errors**: Run the latest migration scripts in `docs/migration/`
- **Authentication issues**: Check environment variables in `.env.local`
- **Map not loading**: Verify Google Maps API key and billing is enabled

See the [Issues](https://github.com/your-repo/issues) page for more known bugs and feature requests.

## 💬 Support

For support, email support@civicconnect.com or open an issue on GitHub.

## 🙏 Acknowledgments

- shadcn/ui for beautiful UI components
- Supabase for backend infrastructure
- Google Maps for location services
- The open-source community

---

Made with ❤️ for better civic engagement
