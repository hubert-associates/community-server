import { fetch } from 'cross-fetch';
import { DataFactory } from 'n3';
import type { Quad } from 'n3';
import { v4 } from 'uuid';
import { TokenOwnershipValidator } from '../../../../src/identity/ownership/TokenOwnershipValidator';
import { RdfToQuadConverter } from '../../../../src/storage/conversion/RdfToQuadConverter';
import type { ExpiringStorage } from '../../../../src/storage/keyvalue/ExpiringStorage';
import { SOLID } from '../../../../src/util/Vocabularies';
const { literal, namedNode, quad } = DataFactory;

jest.mock('cross-fetch');
jest.mock('uuid');

function quadToString(qq: Quad): string {
  const subPred = `<${qq.subject.value}> <${qq.predicate.value}>`;
  if (qq.object.termType === 'Literal') {
    return `${subPred} "${qq.object.value}"`;
  }
  return `${subPred} <${qq.object.value}>`;
}

describe('A TokenOwnershipValidator', (): void => {
  const fetchMock: jest.Mock = fetch as any;
  const webId = 'http://alice.test.com/#me';
  const token = 'randomlyGeneratedToken';
  const tokenTriple = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal(token));
  const tokenString = `${quadToString(tokenTriple)}.`;
  const converter = new RdfToQuadConverter();
  let storage: ExpiringStorage<string, string>;
  let validator: TokenOwnershipValidator;

  function mockFetch(body: string): void {
    fetchMock.mockImplementation((url: string): any => ({
      text: (): any => body,
      url,
      status: 200,
      headers: { get: (): any => 'text/turtle' },
    }));
  }

  beforeEach(async(): Promise<void> => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    (v4 as jest.Mock).mockReturnValue(token);

    const map = new Map<string, any>();
    storage = {
      get: jest.fn().mockImplementation((key: string): any => map.get(key)),
      set: jest.fn().mockImplementation((key: string, value: any): any => map.set(key, value)),
      delete: jest.fn().mockImplementation((key: string): any => map.delete(key)),
    } as any;

    mockFetch('');

    validator = new TokenOwnershipValidator(converter, storage);
  });

  it('errors if no token is stored in the storage.', async(): Promise<void> => {
    // Even if the token is in the WebId, it will error since it's not in the storage
    mockFetch(tokenString);
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    expect(fetch).toHaveBeenCalledTimes(0);
  });

  it('errors if the expected triple is missing.', async(): Promise<void> => {
    // First call will add the token to the storage
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    expect(fetch).toHaveBeenCalledTimes(0);
    // Second call will fetch the WebId
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('resolves if the WebId contains the verification triple.', async(): Promise<void> => {
    mockFetch(tokenString);
    // First call will add the token to the storage
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    // Second call will succeed since it has the verification triple
    await expect(validator.handle({ webId })).resolves.toBeUndefined();
  });

  it('fails if the WebId contains the wrong verification triple.', async(): Promise<void> => {
    const wrongQuad = quad(namedNode(webId), SOLID.terms.oidcIssuerRegistrationToken, literal('wrongToken'));
    mockFetch(`${quadToString(wrongQuad)} .`);
    // First call will add the token to the storage
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
    // Second call will fail since it has the wrong verification triple
    await expect(validator.handle({ webId })).rejects.toThrow(tokenString);
  });
});
