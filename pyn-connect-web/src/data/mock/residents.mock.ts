/** Resident Access demo data, lifted from the design. */
import type { Resident } from '~/core/models/data/connect/resident.data';

// ---- Resident Access ----
export const RESIDENT_TARGETS: string[] = ['Unit','Fitness Center','Pool','Clubhouse','Package Locker','Dog Park','Elevator Bank A','Parking Garage'];
export const SEED_RESIDENTS: Record<string, Resident[]> = {
  luxe:[
    { id:'r1', name:'Elena Vasquez', unit:'1204', phone:'(303) 555-0210', since:'Jan 2026', grants:{Unit:true,'Fitness Center':true,Pool:true,Clubhouse:true,'Package Locker':true,'Dog Park':false,'Elevator Bank A':true,'Parking Garage':true},
      log:[ {what:'Unit 1204', when:'Today 8:12 AM', result:'Unlocked', v:'ok'}, {what:'Fitness Center', when:'Today 6:40 AM', result:'Unlocked', v:'ok'}, {what:'Pool', when:'Yesterday 7:22 PM', result:'Unlocked', v:'ok'}, {what:'Dog Park', when:'Yesterday 5:03 PM', result:'Denied \u2014 no grant', v:'crit'} ] },
    { id:'r2', name:'Andre Whitlock', unit:'0907', phone:'(303) 555-0388', since:'Nov 2025', grants:{Unit:true,'Fitness Center':true,Pool:false,Clubhouse:true,'Package Locker':true,'Dog Park':true,'Elevator Bank A':true,'Parking Garage':false},
      log:[ {what:'Unit 0907', when:'Today 7:55 AM', result:'Unlocked', v:'ok'}, {what:'Package Locker', when:'Yesterday 6:11 PM', result:'Unlocked', v:'ok'}, {what:'Pool', when:'2d ago 4:40 PM', result:'Denied \u2014 no grant', v:'crit'} ] },
    { id:'r3', name:'Mei Tanaka', unit:'1533', phone:'(303) 555-0455', since:'Mar 2026', grants:{Unit:true,'Fitness Center':true,Pool:true,Clubhouse:false,'Package Locker':true,'Dog Park':false,'Elevator Bank A':true,'Parking Garage':true},
      log:[ {what:'Unit 1533', when:'Today 9:30 AM', result:'Unlocked', v:'ok'}, {what:'Parking Garage', when:'Today 9:24 AM', result:'Unlocked', v:'ok'} ] },
  ],
  uptown:[
    { id:'r1', name:'Colin Reyes', unit:'0412', phone:'(214) 555-0611', since:'Feb 2026', grants:{Unit:true,'Fitness Center':true,Pool:true,Clubhouse:true,'Package Locker':false,'Dog Park':false,'Elevator Bank A':false,'Parking Garage':true},
      log:[ {what:'Unit 0412', when:'Today 8:02 AM', result:'Unlocked', v:'ok'} ] },
  ],
  wharf:[], 
  cortsky:[
    { id:'r1', name:'Simone Adebayo', unit:'2201', phone:'(404) 555-0722', since:'Dec 2025', grants:{Unit:true,'Fitness Center':true,Pool:true,Clubhouse:true,'Package Locker':true,'Dog Park':true,'Elevator Bank A':true,'Parking Garage':true},
      log:[ {what:'Unit 2201', when:'Today 7:41 AM', result:'Unlocked', v:'ok'}, {what:'Pool', when:'Yesterday 8:15 PM', result:'Unlocked', v:'ok'} ] },
    { id:'r2', name:'Grant Delaney', unit:'1108', phone:'(404) 555-0839', since:'Jun 2025', grants:{Unit:true,'Fitness Center':false,Pool:false,Clubhouse:true,'Package Locker':true,'Dog Park':false,'Elevator Bank A':true,'Parking Garage':false},
      log:[ {what:'Fitness Center', when:'Today 6:02 AM', result:'Denied \u2014 revoked', v:'crit'}, {what:'Unit 1108', when:'Today 5:58 AM', result:'Unlocked', v:'ok'} ] },
  ],
  bellvista:[
    { id:'r1', name:'Talia Brooks', unit:'0305', phone:'(704) 555-0144', since:'Apr 2026', grants:{Unit:true,'Fitness Center':true,Pool:false,Clubhouse:false,'Package Locker':true,'Dog Park':false,'Elevator Bank A':false,'Parking Garage':false},
      log:[ {what:'Unit 0305', when:'Today 8:44 AM', result:'Unlocked', v:'ok'} ] },
  ],
  millpark:[
    { id:'r1', name:'Owen Diaz', unit:'B2-118', phone:'(512) 555-0266', since:'Oct 2025', grants:{Unit:true,'Fitness Center':true,Pool:true,Clubhouse:true,'Package Locker':true,'Dog Park':true,'Elevator Bank A':false,'Parking Garage':true},
      log:[ {what:'Unit B2-118', when:'Today 7:19 AM', result:'Unlocked', v:'ok'}, {what:'Dog Park', when:'Yesterday 6:48 PM', result:'Unlocked', v:'ok'} ] },
  ],
};

