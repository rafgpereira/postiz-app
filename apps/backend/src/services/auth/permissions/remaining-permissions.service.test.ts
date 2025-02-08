import { mock } from 'jest-mock-extended';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { PermissionsService } from './permissions.service';
import { Sections } from './permissions.service';
import { Period, SubscriptionTier } from '@prisma/client';

// Mock of dependent services
const mockSubscriptionService = mock<SubscriptionService>();
const mockPostsService = mock<PostsService>();
const mockIntegrationService = mock<IntegrationService>();
const mockWebHookService = mock<WebhooksService>();

describe('PermissionsService', () => {
  let service: PermissionsService;

  // Initial setup before each test
  beforeEach(() => {
    process.env.STRIPE_PUBLISHABLE_KEY = 'mock_stripe_key';
    service = new PermissionsService(
      mockSubscriptionService,
      mockPostsService,
      mockIntegrationService,
      mockWebHookService
    );
  });

  // Reusable mocks for `getPackageOptions`
  const baseSubscription = {
    id: 'mock-id',
    organizationId: 'mock-org-id',
    subscriptionTier: 'PRO' as SubscriptionTier,
    identifier: 'mock-identifier',
    cancelAt: new Date(),
    period: {} as Period,
    totalChannels: 5,
    isLifetime: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    disabled: false,
    tokenExpiration: new Date(),
    profile: 'mock-profile',
    postingTimes: '[]',
    lastPostedAt: new Date(),
  };

  const baseOptions = {
    channel: 10,
    current: 'mock-current',
    month_price: 20,
    year_price: 200,
    posts_per_month: 100,
    team_members: true,
    community_features: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: false,
    image_generation_count: 50,
    public_api: true,
    webhooks: 10
  };

  const baseIntegration = {
    id: 'mock-integration-id',
    organizationId: 'mock-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(),
    additionalSettings: '{}',
    refreshNeeded: false,
    refreshToken: 'mock-refresh-token',
    name: 'Mock Integration',
    internalId: 'mock-internal-id',
    picture: 'mock-picture-url',
    providerIdentifier: 'mock-provider',
    token: 'mock-token',
    type: 'social',
    inBetweenSteps: false,
    disabled: false,
    tokenExpiration: new Date(),
    profile: 'mock-profile',
    postingTimes: '[]',
    lastPostedAt: new Date(),
    customInstanceDetails: 'mock-details',
    customerId: 'mock-customer-id',
    rootInternalId: 'mock-root-id',
    customer: {
      id: 'mock-customer-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
      name: 'Mock Customer',
      orgId: 'mock-org-id',
    },
  };

  describe('getRemainingQuota()', () => {
    it('should return 0 for unsupported section (default case)', async () => {
      jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
        subscription: baseSubscription,
        options: baseOptions,
      });
      const remaining = await service.getRemainingQuota('mock-org-id', Sections.ADMIN);
      expect(remaining).toBe(0);
    });

    it('should return remaining channels quota for SECTION.CHANNEL', async () => {
      jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
        subscription: baseSubscription,
        options: baseOptions,
      });
      mockIntegrationService.getIntegrationsList.mockResolvedValue([
        { ...baseIntegration, refreshNeeded: false },
        { ...baseIntegration, refreshNeeded: false },
        { ...baseIntegration, refreshNeeded: true },
      ]);
      const remaining = await service.getRemainingQuota('mock-org-id', Sections.CHANNEL);
      expect(remaining).toBe(8);
    });
    it('should return remaining webhooks quota for SECTION.WEBHOOKS', async () => {
      jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
        subscription: baseSubscription,
        options: baseOptions,
      });
      mockWebHookService.getTotal.mockResolvedValue(2);
      const remaining = await service.getRemainingQuota('mock-org-id', Sections.WEBHOOKS);
      expect(remaining).toBe(8);
    });
    it('should return remaining posts quota for SECTION.POSTS_PER_MONTH', async () => {
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
        subscription: baseSubscription,
        options: baseOptions,
      });
      mockSubscriptionService.getSubscription.mockResolvedValue({
        ...baseSubscription,
        createdAt: fixedDate,
      });
      mockPostsService.countPostsFromDay.mockResolvedValue(30);
      const remaining = await service.getRemainingQuota('mock-org-id', Sections.POSTS_PER_MONTH);
      expect(remaining).toBe(70);
    });
  })
});
