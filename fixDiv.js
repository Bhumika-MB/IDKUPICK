const fs = require('fs');
const path = 'c:/Users/gunad/OneDrive/Desktop/IDKUPICK/frontend/src/pages/GroupDetail.js';
let c = fs.readFileSync(path, 'utf8');

// Fix missing div closes throughout the file
c = c
  // Fix 1: Missing div close before Group Code section
  .replace(
    '</span>\n              </div>\n            <div>\n              <div style={{',
    '</span>\n              </div>\n            </div>\n            <div>\n              <div style={{'
  )
  // Fix 2: Missing div closes after Group Code
  .replace(
    '<div className="group-code" style={{ fontSize: \'18px\' }}>{group.code}</div>\n            </div>',
    '<div className="group-code" style={{ fontSize: \'18px\' }}>{group.code}</div>\n              </div>\n            </div>'
  )
  // Fix 3: Missing div close in members map
  .replace(
    '<div style={{ fontSize: \'14px\', color: \'#6b7280\' }}>{member.user.email}</div>\n                    <div>',
    '<div style={{ fontSize: \'14px\', color: \'#6b7280\' }}>{member.user.email}</div>\n                    </div>\n                    <div>'
  )
  // Fix 4: Missing div close after member checkmark
  .replace(
    '</div>\n                );\n              })}\n            </div>',
    '</div>\n                  </div>\n                );\n              })}\n            </div>'
  )
  // Fix 5: Missing closing divs at end
  .replace(
    '</div>\n    </div>\n  );',
    '</div>\n      </div>\n    </div>\n  );'
  );

fs.writeFileSync(path, c, 'utf8');
const opens = (c.match(/<div[>\s]/g) || []).length;
const closes = (c.match(/<\/div>/g) || []).length;
console.log('File fixed. Opens:', opens, 'Closes:', closes, 'Balanced:', opens === closes);
