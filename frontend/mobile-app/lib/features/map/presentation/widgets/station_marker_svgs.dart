class StationMarkerSvgs {
  static String getSvg({
    required String status,
    required String text,
    bool isSelected = false,
  }) {
    String gradientId = 'grad_inactive';
    String stop1 = '#9CA3AF';
    String stop2 = '#4B5563';

    switch (status) {
      case 'closed':
        gradientId = 'grad_closed';
        stop1 = '#4B5563';
        stop2 = '#1F2937';
        break;
      case 'active_full':
        gradientId = 'grad_active_full';
        stop1 = '#EF4444';
        stop2 = '#DC2626';
        break;
      case 'active_empty':
        gradientId = 'grad_active_empty';
        stop1 = '#10B981';
        stop2 = '#059669';
        break;
      case 'active_partial':
        gradientId = 'grad_active_partial'; // You can use same as empty or different, user just said 5 states.
        stop1 = '#10B981';
        stop2 = '#059669';
        break;
      case 'maintenance':
        gradientId = 'grad_maint';
        stop1 = '#F59E0B';
        stop2 = '#D97706';
        break;
      case 'inactive':
      default:
        gradientId = 'grad_inactive';
        stop1 = '#9CA3AF';
        stop2 = '#4B5563';
        break;
    }

    // Determine font size
    String fontSize = text.length > 3 ? "10" : "14";
    if (text == 'CLOSE') fontSize = "12";
    if (text == 'MAINT') fontSize = "10";

    // For selected state, we can add an outline or just make it bigger. The sizing will be handled by the parent widget.
    return '''
<svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="$gradientId" x1="30" y1="0" x2="30" y2="66" gradientUnits="userSpaceOnUse">
      <stop stop-color="$stop1"/>
      <stop offset="1" stop-color="$stop2"/>
    </linearGradient>
    ${isSelected ? '''
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
    ''' : ''}
  </defs>
  <path d="M30 80C30 80 60 52.4183 60 30C60 13.4315 46.5685 0 30 0C13.4315 0 0 13.4315 0 30C0 52.4183 30 80 30 80Z" fill="url(#$gradientId)" ${isSelected ? 'filter="url(#shadow)"' : ''}/>
  ${isSelected ? '<path d="M30 80C30 80 60 52.4183 60 30C60 13.4315 46.5685 0 30 0C13.4315 0 0 13.4315 0 30C0 52.4183 30 80 30 80Z" stroke="white" stroke-width="2"/>' : ''}
  <circle cx="30" cy="30" r="24" fill="white" fill-opacity="0.2"/>
  <rect x="23" y="16" width="10" height="16" rx="2" fill="white"/>
  <path d="M33 22H35C36.1046 22 37 22.8954 37 24V30C37 31.1046 36.1046 32 35 32H33" stroke="white" stroke-width="2" stroke-linecap="round"/>
  <text x="30" y="56" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="$fontSize" fill="white">$text</text>
</svg>
''';
  }
}
