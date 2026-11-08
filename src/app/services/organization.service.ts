import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  Organization,
  Member,
  Invitation,
  FullOrganization,
  CreateOrganizationRequest,
  InviteMemberRequest
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly orgUrl = `${environment.authUrl}/organization`;

  public organizations = signal<Organization[]>([]);
  public activeOrganization = signal<Organization | null>(null);
  public activeMembers = signal<Member[]>([]);
  public activeInvitations = signal<Invitation[]>([]);
  public isLoading = signal<boolean>(false);
  public isOrgModalOpen = signal<boolean>(false);

  // Computados para RBAC y control de acceso por sede
  public currentMember = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return null;
    return this.activeMembers().find(m => m.userId === currentUserId) || null;
  });

  public currentRole = computed(() => {
    return this.currentMember()?.role || this.authService.currentUser()?.role || 'member';
  });

  public isGlobalAdmin = computed(() => {
    const role = this.currentRole().toLowerCase();
    return role === 'owner' || role === 'admin';
  });

  public assignedWarehouseId = computed(() => {
    const whId = this.currentMember()?.assignedWarehouseId;
    return whId ? Number(whId) : null;
  });

  openOrgModal(): void {
    this.isOrgModalOpen.set(true);
  }

  closeOrgModal(): void {
    this.isOrgModalOpen.set(false);
  }

  loadOrganizations(): Observable<Organization[]> {
    this.isLoading.set(true);
    return this.http.get<Organization[]>(`${this.orgUrl}/list`, { withCredentials: true }).pipe(
      tap({
        next: (list) => {
          this.organizations.set(list || []);
          this.isLoading.set(false);

          if (list && list.length > 0) {
            const savedOrgId = localStorage.getItem('omnistock_active_org_id');
            const found = list.find(o => o.id === savedOrgId) || list[0];
            this.setActiveOrganization(found.id).subscribe();
          } else {
            this.activeOrganization.set(null);
          }
        },
        error: () => this.isLoading.set(false)
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  setActiveOrganization(organizationId: string): Observable<any> {
    return this.http.post(`${this.orgUrl}/set-active`, { organizationId }, { withCredentials: true }).pipe(
      tap(() => {
        const found = this.organizations().find(o => o.id === organizationId) || null;
        this.activeOrganization.set(found);
        localStorage.setItem('omnistock_active_org_id', organizationId);
        this.loadFullOrganization().subscribe();
      })
    );
  }

  createOrganization(payload: CreateOrganizationRequest): Observable<Organization> {
    return this.http.post<Organization>(`${this.orgUrl}/create`, payload, { withCredentials: true }).pipe(
      tap((newOrg) => {
        this.organizations.update(list => [...list, newOrg]);
        this.setActiveOrganization(newOrg.id).subscribe();
      })
    );
  }

  loadFullOrganization(): Observable<FullOrganization | null> {
    return this.http.get<FullOrganization>(`${this.orgUrl}/get-full-organization`, { withCredentials: true }).pipe(
      tap({
        next: (full) => {
          if (full) {
            this.activeMembers.set(full.members || []);
            this.activeInvitations.set(full.invitations || []);
          }
        }
      }),
      catchError(() => of(null))
    );
  }

  inviteMember(payload: InviteMemberRequest): Observable<any> {
    return this.http.post(`${this.orgUrl}/invite-member`, payload, { withCredentials: true }).pipe(
      tap(() => {
        this.loadFullOrganization().subscribe();
      })
    );
  }

  cancelInvitation(invitationId: string): Observable<any> {
    return this.http.post(`${this.orgUrl}/cancel-invitation`, { invitationId }, { withCredentials: true }).pipe(
      tap(() => {
        this.loadFullOrganization().subscribe();
      })
    );
  }

  removeMember(memberIdOrEmail: string): Observable<any> {
    return this.http.post(`${this.orgUrl}/remove-member`, { memberIdOrEmail }, { withCredentials: true }).pipe(
      tap(() => {
        this.loadFullOrganization().subscribe();
      })
    );
  }
}
